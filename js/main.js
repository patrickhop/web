
document.addEventListener('DOMContentLoaded', function() {
  const postContent = document.getElementById('post-content');
  if (postContent) {
    const markdownFile = postContent.getAttribute('data-markdown-file');
    if (markdownFile) {
      fetch(markdownFile)
        .then(response => response.text())
        .then(text => {
          const converter = new showdown.Converter({
            extensions: [
              showdownKatex({
                delimiters: [
                  { left: '$', right: '$', display: false },
                ]
              })
            ],
            tables: true
          });
          const html = converter.makeHtml(text);
          postContent.innerHTML = html;
        });
    }
  }
});
