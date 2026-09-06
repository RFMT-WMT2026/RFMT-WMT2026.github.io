(function () {
  var mount = document.getElementById('cajala-examples');
  if (!mount) return;
  var keys = ['original', 'qwen', 'gpt_oss'];
  var names = { original: 'Original', qwen: 'Qwen', gpt_oss: 'GPT-OSS' };
  var topics = {
    cajala_00000070: 'News · Dinner expenses',
    cajala_00000081: 'SNS · Software and everyday life',
    cajala_00006601: 'Literature · A nighttime bicycle ride'
  };
  var examples = [];
  var current = 0;
  var highlight = false;

  function escape(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Mark inserted or substituted characters relative to Original.
  function difference(original, candidate) {
    var a = Array.from(original);
    var b = Array.from(candidate);
    var table = Array.from({ length: a.length + 1 }, function () {
      return new Uint32Array(b.length + 1);
    });
    for (var i = a.length - 1; i >= 0; i--) {
      for (var j = b.length - 1; j >= 0; j--) {
        table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 :
          Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    var unchanged = new Set();
    i = 0; j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { unchanged.add(j); i++; j++; }
      else if (table[i + 1][j] >= table[i][j + 1]) i++;
      else j++;
    }
    var result = '';
    var marked = false;
    b.forEach(function (character, index) {
      var changed = !unchanged.has(index);
      if (changed !== marked) result += changed ? '<mark>' : '</mark>';
      marked = changed;
      result += escape(character);
    });
    return result + (marked ? '</mark>' : '');
  }

  function context(text, preceding) {
    var value = text.trim();
    var excerpt = value.length > 150 ?
      (preceding ? '…' + value.slice(-150) : value.slice(0, 150) + '…') : value;
    return '<div class="cajala-context"><details>' +
      '<summary><span>' + (preceding ? 'Preceding document context' : 'Following document context') +
      '</span><span class="cajala-expand-hint">Expand / collapse</span></summary>' +
      '<p class="cajala-context-full" lang="ja">' + escape(value || '—') + '</p></details>' +
      '<p class="cajala-context-preview" lang="ja">' + escape(excerpt || '—') + '</p></div>';
  }

  function render(focusSelector) {
    var example = examples[current];
    mount.innerHTML =
      '<div class="cajala-toolbar">' +
        '<div><p class="cajala-example-title">' + escape(topics[example.id] || 'CAJALA example') + '</p>' +
        '<p class="cajala-meta">Example ' + (current + 1) + ' / ' + examples.length + ' · ' +
        example.annotation_count + ' annotators</p></div>' +
        '<nav class="cajala-stepper" aria-label="Example navigation">' +
          '<button type="button" data-step="-1" aria-label="Previous example">←</button>' +
          '<button type="button" data-step="1" aria-label="Next example">→</button>' +
        '</nav>' +
      '</div>' +
      context(example.prefix, true) +
      '<div class="cajala-comparison-heading"><h5>Compare the three candidate segments</h5>' +
        '<label><input type="checkbox" data-highlight ' + (highlight ? 'checked' : '') +
        '> Highlight changes from Original</label></div>' +
      '<p class="cajala-diff-note" ' + (highlight ? '' : 'hidden') +
        '>Highlighted text marks additions and substitutions; omissions are not shown.</p>' +
      '<div class="cajala-comparison-grid">' +
        keys.map(function (key) {
          var preferred = example.preferred_candidates.indexOf(key) !== -1;
          return '<article class="cajala-candidate' + (preferred ? ' is-preferred' : '') + '">' +
            '<header><h6>' + names[key] + '</h6><span class="cajala-votes">' +
              example.votes[key] + ' / ' + example.annotation_count + ' votes</span></header>' +
            '<p class="cajala-candidate-status">' + (preferred ? '✓ Preferred by all three annotators' : 'Not selected') + '</p>' +
            '<p class="cajala-segment" lang="ja">' +
              (highlight && key !== 'original' ? difference(example.candidates.original, example.candidates[key]) :
                escape(example.candidates[key])) + '</p></article>';
        }).join('') +
      '</div>' +
      context(example.suffix, false) +
      '<details class="cajala-translation"><summary>English back-translation</summary>' +
        '<p>' + escape(example.reference_translation) + '</p></details>' +
      '<p class="cajala-sample-id">Sample: ' + escape(example.id) + '</p>';

    mount.querySelectorAll('[data-step]').forEach(function (button) {
      button.addEventListener('click', function () {
        current = (current + Number(button.dataset.step) + examples.length) % examples.length;
        render('[data-step="' + button.dataset.step + '"]');
      });
    });
    mount.querySelector('[data-highlight]').addEventListener('change', function (event) {
      highlight = event.target.checked;
      // Update only the candidate text, preserving expanded context and focus.
      mount.querySelectorAll('.cajala-segment').forEach(function (paragraph, index) {
        var key = keys[index];
        paragraph.innerHTML = highlight && key !== 'original' ?
          difference(example.candidates.original, example.candidates[key]) : escape(example.candidates[key]);
      });
      mount.querySelector('.cajala-diff-note').hidden = !highlight;
    });
    if (focusSelector) mount.querySelector(focusSelector).focus({ preventScroll: true });
  }

  fetch('assets/cajala-examples.json')
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load examples');
      return response.json();
    })
    .then(function (data) {
      if (!Array.isArray(data) || !data.length) throw new Error('No examples available');
      examples = data;
      render();
    })
    .catch(function (error) {
      mount.innerHTML = '<p>CAJALA examples could not be loaded. Please reload the page.</p>';
      console.error(error);
    });
})();
