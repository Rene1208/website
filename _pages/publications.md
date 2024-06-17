---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

{% if site.author.googlescholar %}
  <div class="wordwrap">You can also find all my publications and working papers on <a href="https://scholar.google.com/citations?hl=de&view_op=list_works&gmla=AOAOcb0olUdVNJVR41TpQOJ2WojWEqnM86g1rt5FWGqJDzaWh2P37cyjkwvly19LVc9_foxE0oWVNTpEFX7s0UPSREny8pXjeUwJNZnI1I87PmSGV9T-91sd9NmUZAjlbjU&user=FKR8WdMAAAAJ">my Google Scholar profile</a>.</div>
{% endif %}

{% include base_path %}

{% for post in site.publications reversed %}
  {% include archive-single.html %}
{% endfor %}
