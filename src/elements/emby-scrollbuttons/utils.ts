import globalize from 'lib/globalize';

export enum ScrollDirection {
    RIGHT = 'right',
    LEFT = 'left'
}

interface ScrollState {
    scrollPos: number;
}

interface ScrollerItemSlideIntoViewProps {
    direction: ScrollDirection;
    scrollContainer: HTMLElement | null;
    scrollSlider: HTMLElement | null;
    isHorizontal: boolean;
    scrollState: ScrollState;
}

interface ScrollToWindowProps {
    scrollContainer: HTMLElement;
    items: HTMLElement[];
    scrollState: ScrollState;
    direction: ScrollDirection
}

export function scrollerItemSlideIntoView({ direction, scrollContainer, scrollSlider, isHorizontal, scrollState }: ScrollerItemSlideIntoViewProps) {
    if (!scrollContainer || !isHorizontal) {
        return;
    }

    const slider = scrollSlider ?? scrollContainer;
    const items = [...slider.children].filter((child): child is HTMLElement => child instanceof HTMLElement);

    if (!items.length) {
        return;
    }

    scrollToWindow({
        scrollContainer,
        items,
        scrollState,
        direction
    });
}

function getFirstAndLastVisible(scrollFrame: HTMLElement, items: HTMLElement[], { scrollPos: scrollPosition }: ScrollState) {
    const isRTL = globalize.getIsRTL();
    const localeModifier = isRTL ? -1 : 1;

    const currentScrollPos = scrollPosition * localeModifier;
    const scrollerWidth = scrollFrame.offsetWidth;
    const itemWidth = items[0].offsetWidth;

    // Rounding down here will give us the first item index which is fully visible. We want the first partially visible
    // index so we'll subtract one.
    const firstVisibleIndex = Math.max(Math.floor(currentScrollPos / itemWidth) - 1, 0);
    // Rounding up will give us the last index which is at least partially visible (overflows at container end).
    const lastVisibleIndex = Math.floor((currentScrollPos + scrollerWidth) / itemWidth);

    return [firstVisibleIndex, lastVisibleIndex];
}

function scrollToWindow({
    scrollContainer,
    items,
    scrollState,
    direction = ScrollDirection.RIGHT
}: ScrollToWindowProps) {
    // When we're rendering RTL, scrolling toward the end of the container is toward the left so all of our scroll
    // positions need to be negative.
    const isRTL = globalize.getIsRTL();
    const localeModifier = isRTL ? -1 : 1;

    const frame = scrollContainer;
    const [firstVisibleIndex, lastVisibleIndex] = getFirstAndLastVisible(frame, items, scrollState);

    let scrollToPosition: number;

    if (direction === ScrollDirection.RIGHT) {
        const nextItem = items[lastVisibleIndex] || items[lastVisibleIndex - 1];

        // This will be the position to anchor the item at `lastVisibleIndex` to the start of the view window.
        const nextItemScrollOffset = lastVisibleIndex * nextItem.offsetWidth;
        scrollToPosition = nextItemScrollOffset * localeModifier;
    } else {
        const previousItem = items[firstVisibleIndex];
        const previousItemScrollOffset = firstVisibleIndex * previousItem.offsetWidth;

        // Find the total number of items that can fit in a view window and subtract one to account for item at
        // `firstVisibleIndex`. The total width of these items is the amount that we need to adjust the scroll position by
        // to anchor item at `firstVisibleIndex` to the end of the view window.
        const offsetAdjustment = (Math.floor(frame.offsetWidth / previousItem.offsetWidth) - 1) * previousItem.offsetWidth;

        // This will be the position to anchor the item at `firstVisibleIndex` to the end of the view window.
        scrollToPosition = (previousItemScrollOffset - offsetAdjustment) * localeModifier;
    }

    if (frame.scrollTo) {
        frame.scrollTo({
            left: scrollToPosition,
            behavior: 'smooth'
        });
    } else {
        frame.scrollLeft = scrollToPosition;
    }
}
