---
layout: archive
title: "Working Papers and Work in Progress"
permalink: /working-papers/
author_profile: true
---

<div class="intro-panel">Current working papers, preprints, and selected research projects in progress.</div>

{% include base_path %}

Working Papers and Preprints
======

{% assign has_working_papers = false %}
{% for post in site.publications reversed %}
  {% if post.publication_type == "working-paper" %}
    {% assign has_working_papers = true %}
    {% include archive-single.html %}
  {% endif %}
{% endfor %}

{% unless has_working_papers %}
No working papers are listed at the moment.
{% endunless %}

Selected Work in Progress
======

{% assign has_work_in_progress = false %}
{% for post in site.publications reversed %}
  {% if post.publication_type == "work-in-progress" %}
    {% assign has_work_in_progress = true %}
    {% include archive-single.html %}
  {% endif %}
{% endfor %}

{% unless has_work_in_progress %}
No work-in-progress projects are listed at the moment.
{% endunless %}
