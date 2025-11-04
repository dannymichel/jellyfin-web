import dom from '../../utils/dom';
import layoutManager from '../../components/layoutManager';
import inputManager from '../../scripts/inputManager';
import focusManager from '../../components/focusManager';
import scrollHelper from '../../scripts/scrollHelper';
import 'webcomponents.js/webcomponents-lite';
import './emby-scroller.scss';

const ScrollerPrototype = Object.create(HTMLDivElement.prototype);

ScrollerPrototype.createdCallback = function () {
    this.classList.add('emby-scroller');
};

function isHorizontal(scroller) {
    return scroller.getAttribute('data-horizontal') !== 'false';
}

function shouldSkipWhenVisible(scroller) {
    return scroller.getAttribute('data-skipfocuswhenvisible') === 'true';
}

function getSlider(scroller) {
    return scroller.querySelector('.scrollSlider');
}

function scrollToOffset(scroller, offset, horizontal, immediate) {
    if (scroller.scrollTo) {
        scroller.scrollTo({
            left: horizontal ? offset : scroller.scrollLeft,
            top: horizontal ? scroller.scrollTop : offset,
            behavior: immediate ? 'auto' : 'smooth'
        });
    } else if (horizontal) {
        scroller.scrollLeft = Math.round(offset);
    } else {
        scroller.scrollTop = Math.round(offset);
    }
}

function moveTo(scroller, elem, position, immediate) {
    if (!elem) {
        return;
    }

    const horizontal = isHorizontal(scroller);
    const skipWhenVisible = shouldSkipWhenVisible(scroller);
    const pos = scrollHelper.getPosition(scroller, elem, horizontal);

    if (skipWhenVisible && pos.isVisible) {
        return;
    }

    scrollToOffset(scroller, pos[position], horizontal, immediate === true);
}

function attachCenterFocus(scroller) {
    const handler = function (e) {
        const focused = focusManager.focusableParent(e.target);
        if (!focused) {
            return;
        }

        moveTo(scroller, focused, 'center', false);
    };

    dom.addEventListener(scroller, 'focus', handler, {
        capture: true,
        passive: true
    });

    scroller._focusHandler = handler;
}

function detachCenterFocus(scroller) {
    const handler = scroller._focusHandler;
    if (!handler) {
        return;
    }

    dom.removeEventListener(scroller, 'focus', handler, {
        capture: true,
        passive: true
    });

    scroller._focusHandler = null;
}

function onInputCommand(e) {
    const cmd = e.detail.command;
    if (cmd === 'end') {
        focusManager.focusLast(this, '.' + this.getAttribute('data-navcommands'));
        e.preventDefault();
        e.stopPropagation();
    } else if (cmd === 'pageup') {
        focusManager.moveFocus(e.target, this, '.' + this.getAttribute('data-navcommands'), -12);
        e.preventDefault();
        e.stopPropagation();
    } else if (cmd === 'pagedown') {
        focusManager.moveFocus(e.target, this, '.' + this.getAttribute('data-navcommands'), 12);
        e.preventDefault();
        e.stopPropagation();
    }
}

ScrollerPrototype.scrollToBeginning = function () {
    scrollToOffset(this, 0, isHorizontal(this), true);
};

ScrollerPrototype.toStart = function (elem, immediate) {
    moveTo(this, elem, 'start', immediate);
};

ScrollerPrototype.toCenter = function (elem, immediate) {
    moveTo(this, elem, 'center', immediate);
};

ScrollerPrototype.scrollToPosition = function (pos, immediate) {
    scrollToOffset(this, pos, isHorizontal(this), immediate);
};

ScrollerPrototype.getScrollPosition = function () {
    return isHorizontal(this) ? this.scrollLeft : this.scrollTop;
};

ScrollerPrototype.getScrollSize = function () {
    const horizontal = isHorizontal(this);
    const slider = getSlider(this);

    if (horizontal) {
        return slider ? slider.scrollWidth : this.scrollWidth;
    }

    return slider ? slider.scrollHeight : this.scrollHeight;
};

ScrollerPrototype.getScrollEventName = function () {
    return 'scroll';
};

ScrollerPrototype.getScrollSlider = function () {
    return getSlider(this) || this;
};

ScrollerPrototype.addScrollEventListener = function (fn, options) {
    dom.addEventListener(this, 'scroll', fn, options);
};

ScrollerPrototype.removeScrollEventListener = function (fn, options) {
    dom.removeEventListener(this, 'scroll', fn, options);
};

ScrollerPrototype.attachedCallback = function () {
    if (this.getAttribute('data-navcommands')) {
        inputManager.on(this, onInputCommand);
    }

    const horizontal = isHorizontal(this);
    const slider = getSlider(this);

    if (horizontal && slider) {
        slider.style.whiteSpace = 'nowrap';
    }

    const enableScrollButtons = layoutManager.desktop && horizontal && this.getAttribute('data-scrollbuttons') !== 'false';
    const hideScrollbar = enableScrollButtons || this.getAttribute('data-hidescrollbar') === 'true';
    const allowSmooth = (this.getAttribute('data-allownativesmoothscroll') === 'true' && !enableScrollButtons) || (layoutManager.tv && !enableScrollButtons);

    this.classList.toggle('scrollX', horizontal);
    this.classList.toggle('scrollY', !horizontal);

    if (horizontal) {
        if (!layoutManager.desktop || hideScrollbar) {
            this.classList.add('hiddenScrollX');
            if (allowSmooth) {
                this.classList.add('smoothScrollX');
            } else {
                this.classList.remove('smoothScrollX');
            }
        } else {
            this.classList.remove('hiddenScrollX');
            this.classList.remove('smoothScrollX');
        }

        if (enableScrollButtons) {
            this.classList.add('hiddenScrollX-forced');
        } else {
            this.classList.remove('hiddenScrollX-forced');
        }
    } else {
        if (!layoutManager.desktop || hideScrollbar) {
            this.classList.add('hiddenScrollY');
            if (allowSmooth) {
                this.classList.add('smoothScrollY');
            } else {
                this.classList.remove('smoothScrollY');
            }
        } else {
            this.classList.remove('hiddenScrollY');
            this.classList.remove('smoothScrollY');
        }

        if (enableScrollButtons) {
            this.classList.add('hiddenScrollY-forced');
        } else {
            this.classList.remove('hiddenScrollY-forced');
        }
    }

    if (layoutManager.tv && this.getAttribute('data-centerfocus')) {
        attachCenterFocus(this);
    }

    if (enableScrollButtons) {
        loadScrollButtons(this);
    }
};

function loadScrollButtons(buttonsScroller) {
    import('../emby-scrollbuttons/emby-scrollbuttons').then(() => {
        buttonsScroller.insertAdjacentHTML('beforebegin', '<div is="emby-scrollbuttons" class="emby-scrollbuttons padded-right"></div>');
    });
}

ScrollerPrototype.pause = function () {
    const headroom = this.headroom;
    if (headroom) {
        headroom.pause();
    }
};

ScrollerPrototype.resume = function () {
    const headroom = this.headroom;
    if (headroom) {
        headroom.resume();
    }
};

ScrollerPrototype.detachedCallback = function () {
    if (this.getAttribute('data-navcommands')) {
        inputManager.off(this, onInputCommand);
    }

    detachCenterFocus(this);

    const headroom = this.headroom;
    if (headroom) {
        headroom.destroy();
        this.headroom = null;
    }
};

document.registerElement('emby-scroller', {
    prototype: ScrollerPrototype,
    extends: 'div'
});
