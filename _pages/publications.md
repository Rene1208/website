---
layout: archive
title: "Publications and Working Papers"
permalink: /publications/
author_profile: true
---

{% if site.author.googlescholar %}
  <div class="intro-panel">A current overview of peer-reviewed publications, working papers, and preprints. You can also find my work on <a href="https://scholar.google.com/citations?user=FKR8WdMAAAAJ">Google Scholar</a>.</div>
{% endif %}

{% include base_path %}

{% for post in site.publications reversed %}
  {% include archive-single.html %}
{% endfor %}
