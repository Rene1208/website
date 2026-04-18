---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

{% if site.author.googlescholar %}
  <div class="intro-panel">A current overview of peer-reviewed journal publications. Working papers and ongoing projects are listed separately on the <a href="/working-papers/">Working Papers</a> page. You can also find my work on <a href="https://scholar.google.com/citations?user=FKR8WdMAAAAJ">Google Scholar</a>.</div>
{% endif %}

{% include base_path %}

{% for post in site.publications reversed %}
  {% unless post.publication_type %}
    {% include archive-single.html %}
  {% endunless %}
{% endfor %}
