define([], function() {
    'use strict';

    var ProgressBarPrototype = Object.create(HTMLDivElement.prototype);

    function onAutoTimeProgress() {
        var start = parseInt(this.getAttribute('data-starttime'));
        var end = parseInt(this.getAttribute('data-endtime'));

        var now = new Date().getTime();
        var total = end - start;
        var pct = 100 * ((now - start) / total);

        pct = Math.min(100, pct);
        pct = Math.max(0, pct);

        var itemProgressBarForeground = this.querySelector('.itemProgressBarForeground');
        itemProgressBarForeground.style.width = pct + '%';
    }

    ProgressBarPrototype.attachedCallback = function () {
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
        }

        if (this.getAttribute('data-automode') === 'time') {
            this.timeInterval = setInterval(onAutoTimeProgress.bind(this), 60000);
        }
    };

    ProgressBarPrototype.detachedCallback = function () {
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
            this.timeInterval = null;
        }
    };

    document.registerElement('emby-progressbar', {
        prototype: ProgressBarPrototype,
        extends: 'div'
    });
});
