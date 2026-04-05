;(function ($) {
    'use strict';

    // ───────────────────────────────────────────────────────────────────────────
    // CONFIGURATION CONSTANTS
    // ───────────────────────────────────────────────────────────────────────────
    const ds = document.body.dataset;
    const RECALL_FORWARD = String(ds.recallForward).toLowerCase() === 'true';   // Recall direction: true = forward, false = backward
    const INITIAL_SPAN = Number(ds.initialSpan);  // Starting digit span for practice
    const MAX_SPAN = Number(ds.maxSpan);  // Maximum allowable digit span
    const NUM_REAL_ROUNDS = Number(ds.numRounds);  // Number of real (non-practice) rounds
    const TIMER = Number(ds.timer);  // Delay between digits in ms
    const LANGUAGE = (ds.language || 'en').toLowerCase();


    // ───────────────────────────────────────────────────────────────────────────
    // OPTIONAL: Voice reading out the numbers
    // ───────────────────────────────────────────────────────────────────────────
    const USE_TTS = String(ds.useTts).toLowerCase() === 'true';     // set false to disable voice reading
    const TTS_LANG = LANGUAGE === 'de' ? 'de-DE' : 'en-US';        // or 'de-DE'
    const TTS_RATE = Number(ds.ttsRate) || 1.0;        // 0.1–10; varies by browser

    function speakDigitTTS(digit) {
        if (!USE_TTS) return;
        if (!('speechSynthesis' in window)) return;

        // Prevent queue build-up if something fires twice
        window.speechSynthesis.cancel();

        const u = new SpeechSynthesisUtterance(String(digit));
        u.lang = TTS_LANG;
        u.rate = TTS_RATE;
        u.pitch = 1.0;
        u.volume = 1.0;

        window.speechSynthesis.speak(u);
    }


    // ───────────────────────────────────────────────────────────────────────────
    // CACHE & VERIFY DOM ELEMENTS
    // ───────────────────────────────────────────────────────────────────────────
    const $arrPrint = $('#arrPrint');
    if (!$arrPrint.length) console.error('Missing #arrPrint');  // Display area for digits
    const $digitInput = $('#digit_input');
    if (!$digitInput.length) console.error('Missing #digit_input'); // Hidden input collecting clicks
    const $startBtn = $('#start');
    if (!$startBtn.length) console.error('Missing #start');        // Button to start trial/round
    const $enterBtn = $('#enter_digits');
    if (!$enterBtn.length) console.error('Missing #enter_digits'); // Button to confirm answer
    const $instrBtn = $('#instructions');
    if (!$instrBtn.length) console.error('Missing #instructions'); // Button to open instructions modal
    const $allBtns = $('.btn1');
    if (!$allBtns.length) console.error('Missing .btn1 buttons'); // Digit buttons 1–9
    const $modal = $('#InstructionsModal');
    if (!$modal.length) console.error('Missing #InstructionsModal');  // Instructions overlay
    const $continueBtn = $('#next_button');
    if (!$continueBtn.length) console.error('Missing #next_button');  // oTree Continue button

    // ───────────────────────────────────────────────────────────────────────────
    // GLOBAL STATE
    // ───────────────────────────────────────────────────────────────────────────
    let difficulty = INITIAL_SPAN;    // Current number of digits to present
    let arr = [];             // Array holding current digit sequence
    let correct = [];             // Array of 1s for each correct real round
    let highest_corr = [];             // Highest span correct after each round
    let iter = 0;              // Click counter (1=practice,2..=real)
    let roundResults = [];             // 1/0 correctness per real round
    let rts = [];             // Reaction times per real round
    let realStartTime;                  // Timestamp for real rounds start
    let revealEnd;                      // Timestamp when last digit shown

    // ───────────────────────────────────────────────────────────────────────────
    // INITIALIZE CONTINUE BUTTON
    // ───────────────────────────────────────────────────────────────────────────
    $continueBtn                                // Hide and disable Continue button initially
        .hide()                                 // CSS: hide element
        .prop('disabled', true);               // Prevent early click
    $digitInput.prop('disabled', true);

    // ───────────────────────────────────────────────────────────────────────────
    // UTILITY FUNCTION: TOGGLE DISABLED STATE
    // ───────────────────────────────────────────────────────────────────────────
    function toggleDisabled($els, state) {      // Enable/disable a set of elements
        $els.prop('disabled', state);          // Set disabled property
    }

    // ───────────────────────────────────────────────────────────────────────────
    // METRICS UPDATE FUNCTION
    // ───────────────────────────────────────────────────────────────────────────
    function updateMetrics() {                 // Compute and bind all performance metrics
        const num_corr = correct.length;       // Number of correct real rounds
        const highest = highest_corr.length ? Math.max(...highest_corr) : 0;
        const total_score = num_corr && highest ? num_corr * highest : 0;    // Composite score
        const byRound = roundResults.join(','); // CSV string of correctness flags
        const firstFail = roundResults.findIndex(r => r === 0);             // Index of first miss
        const first_fail_round = firstFail >= 0 ? firstFail + 1 : 0;         // 1-based first fail
        const avg_rt = rts.length ? Math.round(rts.reduce((a, b) => a + b) / rts.length) : 0; // Mean RT
        const total_time = realStartTime ? Date.now() - realStartTime : 0;  // Total elapsed task time
        let max_streak = 0, cur = 0;          // Track longest correct streak
        for (const r of roundResults) {        // Loop through roundResults
            if (r) {
                cur++;
                max_streak = Math.max(max_streak, cur);
            } else {
                cur = 0;
            }
        }

        // // Log all metrics to console for debugging
        // console.log({
        //     n_correct: num_corr,
        //     highest_digits: highest,
        //     score_digits: total_score,
        //     correct_by_round: byRound,
        //     first_fail_round: first_fail_round,
        //     avg_rt: avg_rt,
        //     total_time: total_time,
        //     max_streak: max_streak
        // });


        $('#n_correct').val(num_corr);        // Bind number correct
        $('#highest_digits').val(highest);    // Bind highest span
        $('#score_digits').val(total_score);  // Bind composite score
        $('#correct_by_round').val(byRound);  // Bind correctness CSV
        $('#first_fail_round').val(first_fail_round); // Bind first_fail
        $('#avg_rt').val(avg_rt);            // Bind avg RT
        $('#total_time').val(total_time);    // Bind total_time
        $('#max_streak').val(max_streak);    // Bind longest streak
    }


    // ───────────────────────────────────────────────────────────────────────────
    // GENERATE RANDOM DIGITS
    // ───────────────────────────────────────────────────────────────────────────
    function generateRandomDigits(count) {      // Create sequence of non-adjacent digits
        const digits = [], max = 9;             // Max digits, set in settings.py
        let last = null;                        // Track last value to avoid repeats
        for (let i = 0; i < count; i++) {       // Loop count times
            let val;                            // Placeholder for random digit
            do {
                val = Math.floor(Math.random() * max) + 1;
            } while (val === last); // Regenerate if same
            digits.push(val);                   // Append digit
            last = val;                         // Update last
        }
        return digits;                         // Return array
    }

    // ───────────────────────────────────────────────────────────────────────────
    // DISPLAY DIGITS
    // ───────────────────────────────────────────────────────────────────────────
    function displayDigitsWithDelay(digits) {  // Sequentially show digits
        digits.forEach((d, i) => {              // For each digit and index
            setTimeout(() => {                 // Schedule display
                $arrPrint
                    .css('visibility', 'visible') // Show digit container
                    .text(d);                  // Set digit text
                // 2. Speak digit (browser TTS test version)
                speakDigitTTS(d);
                if (i === digits.length - 1)    // If last digit
                    revealEnd = Date.now();     // Record actual reveal time
            }, TIMER * (i + 1));               // Delay per position
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // START/TRIAL HANDLER
    // ───────────────────────────────────────────────────────────────────────────
    $startBtn.on('click', () => {               // On Start or Next Round click
        iter++;                                  // Increment iteration count
        arr = [];                                // Clear previous sequence
        if (iter === 2) realStartTime = Date.now(); // Real rounds start
        const realStart = 2, realEnd = NUM_REAL_ROUNDS + 1; // Range of real iter
        if (iter >= realStart && iter <= realEnd) { // If in real rounds
            const roundNo = iter - 1;           // Compute 1-based round number
            $('#round').text(roundNo);         // Display round number
            $('#round_span').css('visibility', 'visible'); // Make visible
        }
        // Disable interaction during digit display
        toggleDisabled($digitInput.add($startBtn).add($enterBtn).add($instrBtn), true);
        // Determine span for this round, clamp to MAX_SPAN
        const span = Math.min(difficulty, MAX_SPAN);
        arr = generateRandomDigits(span);       // Generate sequence
        displayDigitsWithDelay(arr);            // Show sequence
        // Re-enable inputs after full sequence
        setTimeout(() => {
            if (USE_TTS && ('speechSynthesis' in window)) window.speechSynthesis.cancel();
            $arrPrint.css('visibility', 'hidden'); // Hide digit container
            toggleDisabled($digitInput.add($enterBtn).add($allBtns), false); // Enable inputs
        }, TIMER * (arr.length + 1));
    });

    // ───────────────────────────────────────────────────────────────────────────
    // CONFIRM ANSWER HANDLER
    // ───────────────────────────────────────────────────────────────────────────
    $enterBtn.on('click', () => {               // On Confirm Answer
        const inputVal = $digitInput.val();      // Get entered digits
        if (!inputVal) return;                  // Do nothing if empty
        if (USE_TTS && ('speechSynthesis' in window)) window.speechSynthesis.cancel();
        toggleDisabled($startBtn.add($instrBtn), false); // Re-enable start/instructions
        if (iter === 1) {                        // If practice trial
            $startBtn.text(
                LANGUAGE === 'de'
                    ? 'Test starten'
                    : 'Start Test'
            );      // Change button text
            toggleDisabled($digitInput.add($enterBtn), true); // Disable input
        }
        if (iter > 1) {                         // If real round
            if (iter % 2 === 1)                 // After each two rounds
                difficulty = Math.min(difficulty + 1, MAX_SPAN); // Increase span
            $startBtn.text(
                LANGUAGE === 'de'
                    ? 'Nächste Runde starten'
                    : 'Start Next Round'
            ); // Update button text
            toggleDisabled($digitInput.add($enterBtn).add($allBtns), true); // Disable inputs
        }
        // Determine correct sequence based on recall direction
        const seq = RECALL_FORWARD ? arr : arr.slice().reverse();
        const correctAns = parseInt(seq.join(''), 10); // Numeric correct answer
        const actualAns = parseInt(inputVal, 10);     // Numeric actual answer
        const wasCorrect = actualAns === correctAns;   // Boolean correctness
        if (iter > 1) {
            roundResults.push(wasCorrect ? 1 : 0);
            rts.push(Date.now() - revealEnd);
        } // Record performance
        if (iter < 2) { // Practice feedback only
            const titleCorrect = (LANGUAGE === 'de') ? 'Richtig!' : 'Correct!';
            const titleWrong = (LANGUAGE === 'de') ? 'Falsch!' : 'Wrong!';
            const textCorrect = (LANGUAGE === 'de') ? 'Sie haben die richtige Zahl eingegeben.' : 'You entered the correct number.';
            const textWrong = (LANGUAGE === 'de')
                ? `Sie haben die falsche Zahl eingegeben. Die richtige Zahl wäre '${correctAns}' gewesen.`
                : `You have entered the wrong number. The correct number would have been '${correctAns}'.`;

            Swal.fire({
                title: wasCorrect ? titleCorrect : titleWrong,
                text: wasCorrect ? textCorrect : textWrong,
                icon: wasCorrect ? 'success' : 'error',
                confirmButtonText: (LANGUAGE === 'de') ? 'OK' : 'OK',
                confirmButtonColor: '#B99A70'
            });
        }
        if (wasCorrect) {                       // If correct
            $allBtns.prop('disabled', true);     // Disable digit buttons
            if (iter > 1) {
                correct.push(1);
                highest_corr.push(arr.length);
            } // Track data
            $digitInput.val('');               // Clear input
            toggleDisabled($digitInput.add($enterBtn), true); // Disable input
            toggleDisabled($startBtn.add($instrBtn), false);  // Enable controls
        } else {                               // If incorrect
            $digitInput.val('');               // Clear input
            $allBtns.prop('disabled', true);   // Disable digit buttons
        }
        if (iter === NUM_REAL_ROUNDS + 1) {       // After final real round
            $continueBtn.show().prop('disabled', false); // Show Continue
            toggleDisabled($digitInput.add($startBtn).add($instrBtn).add($enterBtn), true); // Disable controls
        }
        updateMetrics();                       // Update hidden fields
    });

    // ───────────────────────────────────────────────────────────────────────────
    // DIGIT-CLICK HANDLER
    // ───────────────────────────────────────────────────────────────────────────
    $('.digit-buttons').on('click', '.btn1:not(:disabled)', function () { // Delegate click
        $digitInput.val($digitInput.val() + $(this).text()); // Append clicked digit
    });

    // ───────────────────────────────────────────────────────────────────────────
    // PREVENT KEYBOARD ENTRY & SUBMISSION
    // ───────────────────────────────────────────────────────────────────────────
    $('form').on('keydown', e => {            // Intercept key presses
        if (['Enter', 'Tab', ' '].includes(e.key)) e.preventDefault(); // Block Enter/Tab/Space
    });

    // ───────────────────────────────────────────────────────────────────────────
    // MODAL OPEN/CLOSE LOGIC
    // ───────────────────────────────────────────────────────────────────────────
    const $close = $modal.find('.close');     // Button to close modal
    $instrBtn.on('click', () => $modal.show()); // Open modal
    $close.on('click', () => $modal.hide()); // Close on ×
    $modal.on('click', e => {                  // Close on backdrop click
        if (e.target === $modal[0]) $modal.hide();
    });

})(jQuery);
