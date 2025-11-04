import React, { type FC, type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import useElementSize from 'hooks/useElementSize';
import layoutManager from '../../components/layoutManager';
import focusManager from '../../components/focusManager';
import scrollHelper from '../../scripts/scrollHelper';
import ResizeObserver from 'resize-observer-polyfill';
import ScrollButtons from '../emby-scrollbuttons/ScrollButtons';
import './emby-scroller.scss';

export interface ScrollerProps {
    className?: string;
    isHorizontalEnabled?: boolean;
    isMouseWheelEnabled?: boolean;
    isCenterFocusEnabled?: boolean;
    isScrollButtonsEnabled?: boolean;
    isSkipFocusWhenVisibleEnabled?: boolean;
    isScrollEventEnabled?: boolean;
    isHideScrollbarEnabled?: boolean;
    isAllowNativeSmoothScrollEnabled?: boolean;
}

const Scroller: FC<PropsWithChildren<ScrollerProps>> = ({
    className,
    isHorizontalEnabled = true,
    isMouseWheelEnabled = false,
    isCenterFocusEnabled = false,
    isScrollButtonsEnabled = true,
    isSkipFocusWhenVisibleEnabled = false,
    isScrollEventEnabled = false,
    isHideScrollbarEnabled = false,
    isAllowNativeSmoothScrollEnabled = false,
    children
}) => {
    const [scrollRef, size] = useElementSize<HTMLDivElement>();

    const [showControls, setShowControls] = useState(false);
    const [scrollState, setScrollState] = useState({
        scrollSize: size.width,
        scrollPos: 0,
        scrollWidth: 0
    });
    const scrollSliderRef = useRef<HTMLElement | null>(null);

    const enableScrollButtons = layoutManager.desktop && isHorizontalEnabled && isScrollButtonsEnabled;
    const shouldHideScrollbar = enableScrollButtons || isHideScrollbarEnabled || !layoutManager.desktop;
    const smoothScrollEnabled = (isAllowNativeSmoothScrollEnabled && !enableScrollButtons) || (layoutManager.tv && !enableScrollButtons);

    const scrollerClassName = classNames(
        'emby-scroller',
        className,
        {
            scrollX: isHorizontalEnabled,
            scrollY: !isHorizontalEnabled,
            hiddenScrollX: isHorizontalEnabled && shouldHideScrollbar,
            hiddenScrollY: !isHorizontalEnabled && shouldHideScrollbar,
            smoothScrollX: isHorizontalEnabled && smoothScrollEnabled,
            smoothScrollY: !isHorizontalEnabled && smoothScrollEnabled,
            'hiddenScrollX-forced': isHorizontalEnabled && enableScrollButtons,
            'hiddenScrollY-forced': !isHorizontalEnabled && enableScrollButtons
        }
    );

    const getScrollSlider = useCallback(() => {
        if (scrollSliderRef.current) {
            return scrollSliderRef.current;
        }

        return scrollRef.current ?? undefined;
    }, [scrollRef]);

    const getScrollPosition = useCallback(() => {
        const frame = scrollRef.current;
        if (!frame) {
            return 0;
        }

        return isHorizontalEnabled ? frame.scrollLeft : frame.scrollTop;
    }, [isHorizontalEnabled, scrollRef]);

    const getScrollWidth = useCallback(() => {
        const frame = scrollRef.current;
        if (!frame) {
            return 0;
        }

        const slider = scrollSliderRef.current;

        if (isHorizontalEnabled) {
            return slider ? slider.scrollWidth : frame.scrollWidth;
        }

        return slider ? slider.scrollHeight : frame.scrollHeight;
    }, [isHorizontalEnabled, scrollRef]);

    const getStyleValue = useCallback((style: CSSStyleDeclaration, name: string) => {
        let value = style.getPropertyValue(name);
        if (!value) {
            return 0;
        }

        value = value.replace('px', '');
        if (!value) {
            return 0;
        }

        if (isNaN(parseInt(value, 10))) {
            return 0;
        }

        return Number(value);
    }, []);

    const getScrollSize = useCallback(() => {
        const scroller = scrollRef?.current;
        if (!scroller) {
            return 0;
        }

        let scrollSize = isHorizontalEnabled ? scroller.offsetWidth : scroller.offsetHeight;
        let style = window.getComputedStyle(scroller, null);

        if (isHorizontalEnabled) {
            const paddingLeft = getStyleValue(style, 'padding-left');
            const paddingRight = getStyleValue(style, 'padding-right');
            scrollSize -= paddingLeft + paddingRight;
        } else {
            const paddingTop = getStyleValue(style, 'padding-top');
            const paddingBottom = getStyleValue(style, 'padding-bottom');
            scrollSize -= paddingTop + paddingBottom;
        }

        const slider = getScrollSlider();
        if (slider) {
            style = window.getComputedStyle(slider, null);

            if (isHorizontalEnabled) {
                const paddingLeft = getStyleValue(style, 'padding-left');
                const paddingRight = getStyleValue(style, 'padding-right');
                scrollSize -= paddingLeft + paddingRight;
            } else {
                const paddingTop = getStyleValue(style, 'padding-top');
                const paddingBottom = getStyleValue(style, 'padding-bottom');
                scrollSize -= paddingTop + paddingBottom;
            }
        }

        return scrollSize;
    }, [getScrollSlider, getStyleValue, isHorizontalEnabled, scrollRef]);

    const onScroll = useCallback(() => {
        const scrollSizeValue = getScrollSize();
        const scrollPosValue = getScrollPosition();
        const scrollWidthValue = getScrollWidth();

        setScrollState({
            scrollSize: scrollSizeValue,
            scrollPos: scrollPosValue,
            scrollWidth: scrollWidthValue
        });
    }, [getScrollPosition, getScrollSize, getScrollWidth]);

    const scrollToOffset = useCallback((offset: number, immediate: boolean) => {
        const frame = scrollRef.current;
        if (!frame) {
            return;
        }

        if (frame.scrollTo) {
            frame.scrollTo({
                left: isHorizontalEnabled ? offset : frame.scrollLeft,
                top: isHorizontalEnabled ? frame.scrollTop : offset,
                behavior: immediate ? 'auto' : 'smooth'
            });
        } else if (isHorizontalEnabled) {
            frame.scrollLeft = Math.round(offset);
        } else {
            frame.scrollTop = Math.round(offset);
        }
    }, [isHorizontalEnabled, scrollRef]);

    useEffect(() => {
        const frame = scrollRef.current;
        if (!frame) {
            return;
        }

        const slider = frame.querySelector('.scrollSlider') as HTMLElement | null;
        scrollSliderRef.current = slider ?? frame;

        if (slider && isHorizontalEnabled) {
            slider.style.whiteSpace = 'nowrap';
        }

        const ResizeObserverImpl = window.ResizeObserver ?? ResizeObserver;

        if (!slider) {
            return;
        }

        const resizeObserver = new ResizeObserverImpl(() => {
            onScroll();
        });

        resizeObserver.observe(slider);

        return () => {
            resizeObserver.disconnect();
        };
    }, [isHorizontalEnabled, onScroll, scrollRef]);

    useEffect(() => {
        const frame = scrollRef.current;
        if (!frame || !layoutManager.tv || !isCenterFocusEnabled) {
            return;
        }

        const handleFocus = (event: FocusEvent) => {
            const focused = focusManager.focusableParent(event.target);
            if (!focused) {
                return;
            }

            const pos = scrollHelper.getPosition(frame, focused, isHorizontalEnabled);
            if (isSkipFocusWhenVisibleEnabled && pos.isVisible) {
                return;
            }

            scrollToOffset(pos.center, false);
        };

        frame.addEventListener('focusin', handleFocus, {
            passive: true
        });

        return () => {
            frame.removeEventListener('focusin', handleFocus);
        };
    }, [
        isCenterFocusEnabled,
        isSkipFocusWhenVisibleEnabled,
        isHorizontalEnabled,
        scrollToOffset,
        scrollRef
    ]);

    useEffect(() => {
        const frame = scrollRef.current;
        if (!frame) {
            return;
        }

        if (enableScrollButtons || isScrollEventEnabled) {
            frame.addEventListener('scroll', onScroll, {
                passive: true
            });
        }

        onScroll();
        setShowControls(enableScrollButtons);

        return () => {
            if (enableScrollButtons || isScrollEventEnabled) {
                frame.removeEventListener('scroll', onScroll);
            }
        };
    }, [enableScrollButtons, isScrollEventEnabled, onScroll, scrollRef]);

    useEffect(() => {
        onScroll();
    }, [onScroll, size.height, size.width]);

    useEffect(() => {
        const frame = scrollRef.current;
        if (!frame || !isHorizontalEnabled || !isMouseWheelEnabled) {
            return;
        }

        const handleWheel = (event: WheelEvent) => {
            if (Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.deltaY === 0) {
                return;
            }

            if (frame.scrollBy) {
                frame.scrollBy({
                    left: event.deltaY,
                    behavior: 'auto'
                });
            } else {
                frame.scrollLeft += event.deltaY;
            }

            event.preventDefault();
        };

        frame.addEventListener('wheel', handleWheel, {
            passive: false
        });

        return () => {
            frame.removeEventListener('wheel', handleWheel);
        };
    }, [isHorizontalEnabled, isMouseWheelEnabled, scrollRef]);

    return (
        <>
            {
                showControls && scrollState.scrollWidth > scrollState.scrollSize + 20
                    && <ScrollButtons
                        scrollContainerRef={scrollRef}
                        scrollSliderRef={scrollSliderRef}
                        isHorizontal={isHorizontalEnabled}
                        scrollState={scrollState}
                    />
            }

            <div
                ref={scrollRef}
                className={scrollerClassName}
            >
                {children}

            </div>

        </>
    );
};

export default Scroller;
