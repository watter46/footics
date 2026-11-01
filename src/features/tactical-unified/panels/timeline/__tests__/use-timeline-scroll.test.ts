import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimelineScroll } from '../use-timeline-scroll';

describe('useTimelineScroll', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'scrollLeft', {
      writable: true,
      value: 0,
    });
    // Element.prototype.setPointerCapture / releasePointerCapture のモック
    container.setPointerCapture = vi.fn();
    container.releasePointerCapture = vi.fn();
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('ホイール操作時に垂直ホイール (deltaY) を水平スクロール (scrollLeft) に変換する', () => {
    const { result } = renderHook(() =>
      useTimelineScroll({ activeSlideId: 's1', slideCount: 1 }),
    );

    // containerRef を模擬設定
    (
      result.current.containerRef as { current: HTMLDivElement | null }
    ).current = container;

    // React onWheel コールバック
    act(() => {
      const syntheticWheelEvent = {
        deltaY: 50,
        defaultPrevented: false,
        preventDefault: vi.fn(),
      } as unknown as React.WheelEvent<HTMLDivElement>;

      result.current.onWheel(syntheticWheelEvent);
    });

    expect(container.scrollLeft).toBe(50);

    // defaultPrevented の場合は二重実行防止で加算されない
    act(() => {
      const syntheticWheelEvent = {
        deltaY: 50,
        defaultPrevented: true,
        preventDefault: vi.fn(),
      } as unknown as React.WheelEvent<HTMLDivElement>;

      result.current.onWheel(syntheticWheelEvent);
    });

    expect(container.scrollLeft).toBe(50);
  });

  it('コンテナへの native wheel イベントで preventDefault が呼ばれ水平スクロールする', () => {
    let capturedScroll: ReturnType<typeof useTimelineScroll> | null = null;

    function TestComp() {
      const scroll = useTimelineScroll({ activeSlideId: 's1', slideCount: 1 });
      capturedScroll = scroll;
      return createElement('div', {
        ref: scroll.containerRef,
        onWheel: scroll.onWheel,
        onPointerDown: scroll.onPointerDown,
      });
    }

    const { container: wrapperContainer } = render(createElement(TestComp));
    const scrollDiv = wrapperContainer.firstElementChild as HTMLDivElement;
    Object.defineProperty(scrollDiv, 'scrollLeft', {
      writable: true,
      value: 0,
    });

    const wheelEvent = new Event('wheel', {
      bubbles: true,
      cancelable: true,
    }) as WheelEvent;
    Object.defineProperty(wheelEvent, 'deltaY', { value: 30 });

    act(() => {
      scrollDiv.dispatchEvent(wheelEvent);
    });

    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(scrollDiv.scrollLeft).toBe(30);
    expect(capturedScroll).not.toBeNull();
  });

  it('余白の pointerdown & move でドラッグスクロールし、pointerup で終了する', () => {
    const { result } = renderHook(() =>
      useTimelineScroll({ activeSlideId: 's1', slideCount: 1 }),
    );

    (
      result.current.containerRef as { current: HTMLDivElement | null }
    ).current = container;

    // 余白のポインターダウン (button === 0)
    act(() => {
      const downEvent = {
        button: 0,
        clientX: 100,
        pointerId: 1,
        target: container,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent<HTMLDivElement>;

      result.current.onPointerDown(downEvent);
    });

    expect(result.current.isDragging).toBe(true);

    // window pointermove でスクロール移動
    act(() => {
      fireEvent(
        window,
        new MouseEvent('pointermove', {
          clientX: 60, // 40px 左へ動いた -> scrollLeft は +40
        }),
      );
    });

    expect(container.scrollLeft).toBe(40);

    // window pointerup でドラッグ終了
    act(() => {
      fireEvent(window, new MouseEvent('pointerup'));
    });

    expect(result.current.isDragging).toBe(false);
  });

  it('ボタンやカード要素上の pointerdown ではドラッグスクロールを開始しない', () => {
    const { result } = renderHook(() =>
      useTimelineScroll({ activeSlideId: 's1', slideCount: 1 }),
    );

    (
      result.current.containerRef as { current: HTMLDivElement | null }
    ).current = container;

    const button = document.createElement('button');
    container.appendChild(button);

    act(() => {
      const downEvent = {
        button: 0,
        clientX: 100,
        pointerId: 1,
        target: button,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent<HTMLDivElement>;

      result.current.onPointerDown(downEvent);
    });

    expect(result.current.isDragging).toBe(false);

    // 右クリック (button !== 0) でも開始しない
    act(() => {
      const downEvent = {
        button: 2,
        clientX: 100,
        pointerId: 1,
        target: container,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent<HTMLDivElement>;

      result.current.onPointerDown(downEvent);
    });

    expect(result.current.isDragging).toBe(false);
  });

  it('activeSlideId または slideCount 変更時に該当スライドへ scrollIntoView を呼ぶ', async () => {
    const slideElement = document.createElement('div');
    slideElement.setAttribute('data-slide-id', 'slide-2');
    slideElement.scrollIntoView = vi.fn();
    container.appendChild(slideElement);

    const { result, rerender } = renderHook(
      (props: { activeSlideId: string; slideCount: number }) =>
        useTimelineScroll(props),
      {
        initialProps: { activeSlideId: 'slide-1', slideCount: 1 },
      },
    );

    (
      result.current.containerRef as { current: HTMLDivElement | null }
    ).current = container;

    // activeSlideId を slide-2 に変更
    rerender({ activeSlideId: 'slide-2', slideCount: 2 });

    // requestAnimationFrame を実行待機
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(slideElement.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      }),
    );
  });
});
