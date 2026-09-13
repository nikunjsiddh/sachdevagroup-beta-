/**
 *
 * ---------------------------------------------------------------------------
 *
 * Template Name:  Tasty Bite
 * Author : Tasty Bite
 * Description: This is consulting and Corporate HTML5 template
 * Version : 1.0
 *
 * ---------------------------------------------------------------------------
 *
 */
/*  ==================================
 *           js content
 *    ==================================
 *
 *   1. scroll to top js
 *   2. Sticky js
 *   3. Slick nav
 *   4. Main slider
 *   5. Drinks sort and filter
 *   6. Food slider
 *   7. Project portfolio section
 *   8. Gallery measonary
 *   9. Footer pop up gallery - Magnific popup
 *   10.  Counter up
 *   11. Google map
 *	================================== */
(function ($) {
  "use strict";
  $(function () {
    var $mainwindow = $(window);
    /*====================================
        scroll to top + sticky header
    ======================================*/
    /* These were two separate jQuery .on("scroll") handlers. jQuery 1.12
       has no way to pass {passive:true}, so the browser had to treat both
       as potentially calling preventDefault() and could not start the
       scroll until they had returned — on every event, on all thirteen
       pages. Each one also re-ran a selector query per event, and the
       back-to-top button kicked a .fadeIn(200)/.fadeOut(200) animation
       queue every time rather than once per state change.

       They are now one native passive listener that does nothing but store
       the scroll position, with all the reading and writing batched into a
       single rAF callback and skipped entirely when neither state changed.

       Behaviour is identical, minus the fade: the button is shown and
       hidden through .is-visible, which css/style.css transitions on
       opacity — a compositor property, where the jQuery fade was animating
       inline styles frame by frame off the main thread's timer. */
    var toTopBtn = document.getElementById("toTopBtn");
    var navbar = $(".header");
    var navbarEl = navbar[0];
    var scrolled = false;
    var topShown = false;
    /* threshold kept below the header's own (unscrolled) height so it
       switches to fixed before it would otherwise scroll out of view */
    var stickyThreshold = 80;
    var TO_TOP_THRESHOLD = 250;
    var scrollTicking = false;
    var lastScrollY = 0;

    function onScrollFrame() {
      scrollTicking = false;
      var y = lastScrollY;

      if (toTopBtn) {
        var wantTop = y > TO_TOP_THRESHOLD;
        if (wantTop !== topShown) {
          topShown = wantTop;
          toTopBtn.classList.toggle("is-visible", wantTop);
        }
      }

      if (navbarEl) {
        var wantSticky = y > stickyThreshold;
        if (wantSticky !== scrolled) {
          scrolled = wantSticky;
          if (wantSticky) {
            navbarEl.classList.add("sticky_menu", "animated", "fadeInDown");
          } else {
            navbarEl.classList.remove("sticky_menu", "animated", "fadeInDown");
          }
          navbarEl.style.marginTop = "0px";
        }
      }
    }

    window.addEventListener(
      "scroll",
      function () {
        lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
        if (!scrollTicking) {
          scrollTicking = true;
          requestAnimationFrame(onScrollFrame);
        }
      },
      { passive: true }
    );
    /* set the initial state for a load that starts part-way down the page */
    lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
    onScrollFrame();

    $("#toTopBtn").on("click", function () {
      $("html, body").animate(
        {
          scrollTop: 0,
        },
        "slow"
      );
      return false;
    });
    /*====================================
            slick nav
        ======================================*/
    var logo_path = $(".mobile-menu").data("logo");
    $("#main-menu").slicknav({
      appendTo: ".mobile-menu",
      removeClasses: true,
      label: "",
      /* Inline SVG, not Font Awesome. These two strings were the last thing on
         the site pulling in the icon font — the markup carries none now.
         They were also malformed: `<i class="..."><i/>` closes with a second
         OPENING tag, so every menu row shipped a stray empty <i> that the
         parser had to recover from. Same 24x24 artboard and stroke-width 2 as
         the rest of the UI glyphs; sized by .slicknav_nav .sg-ico in
         css/icons.css because the mobile menu sets its own type scale. */
      closedSymbol:
        '<svg class="sg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 5.5 6.5 6.5-6.5 6.5"/></svg>',
      openedSymbol:
        '<svg class="sg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5.5 9 6.5 6.5 6.5-6.5"/></svg>',
      brand: '<img src="' + logo_path + '" class="img-responsive" alt="logo">',
    });

    /* Everything that used to follow this point has been removed:
       the Owl Carousel init on .testy-slider, the imagesLoaded/Isotope
       filtered grid on .food-menu-section + .drinks-items, both Magnific
       Popup galleries on .magni-link and .gallery-popup, the counterUp call
       on .count, and the Google Maps initializer on #map.

       All six were inherited from the restaurant template this site started
       from, and not one of their selectors exists in any of the thirteen
       pages — so every call was a jQuery query that matched nothing and an
       .each() over an empty set. The #map block was worse than inert: it was
       ready to throw ReferenceError: google is not defined the moment an
       element with that id appeared, because no Maps script is loaded.

       The libraries behind them came out of js/plugins.js in the same pass,
       which took that file from 141 KB to 9 KB. See the header there. */
  });
})(jQuery);

// lenis

function t(t, e, i) {
  return Math.max(t, Math.min(e, i));
}
var e = class {
  isRunning = !1;
  value = 0;
  from = 0;
  to = 0;
  currentTime = 0;
  lerp;
  duration;
  easing;
  onUpdate;
  advance(e) {
    if (!this.isRunning) return;
    let i = !1;
    if (this.duration && this.easing) {
      this.currentTime += e;
      const s = t(0, this.currentTime / this.duration, 1);
      i = s >= 1;
      const o = i ? 1 : this.easing(s);
      this.value = this.from + (this.to - this.from) * o;
    } else
      this.lerp
        ? ((this.value = (function (t, e, i, s) {
            return (function (t, e, i) {
              return (1 - i) * t + i * e;
            })(t, e, 1 - Math.exp(-i * s));
          })(this.value, this.to, 60 * this.lerp, e)),
          Math.round(this.value) === this.to &&
            ((this.value = this.to), (i = !0)))
        : ((this.value = this.to), (i = !0));
    i && this.stop(), this.onUpdate?.(this.value, i);
  }
  stop() {
    this.isRunning = !1;
  }
  fromTo(t, e, { lerp: i, duration: s, easing: o, onStart: n, onUpdate: r }) {
    (this.from = this.value = t),
      (this.to = e),
      (this.lerp = i),
      (this.duration = s),
      (this.easing = o),
      (this.currentTime = 0),
      (this.isRunning = !0),
      n?.(),
      (this.onUpdate = r);
  }
};
var i = class {
    constructor(t, e, { autoResize: i = !0, debounce: s = 250 } = {}) {
      (this.wrapper = t),
        (this.content = e),
        i &&
          ((this.debouncedResize = (function (t, e) {
            let i;
            return function (...s) {
              let o = this;
              clearTimeout(i),
                (i = setTimeout(() => {
                  (i = void 0), t.apply(o, s);
                }, e));
            };
          })(this.resize, s)),
          this.wrapper instanceof Window
            ? window.addEventListener("resize", this.debouncedResize, !1)
            : ((this.wrapperResizeObserver = new ResizeObserver(
                this.debouncedResize
              )),
              this.wrapperResizeObserver.observe(this.wrapper)),
          (this.contentResizeObserver = new ResizeObserver(
            this.debouncedResize
          )),
          this.contentResizeObserver.observe(this.content)),
        this.resize();
    }
    width = 0;
    height = 0;
    scrollHeight = 0;
    scrollWidth = 0;
    debouncedResize;
    wrapperResizeObserver;
    contentResizeObserver;
    destroy() {
      this.wrapperResizeObserver?.disconnect(),
        this.contentResizeObserver?.disconnect(),
        this.wrapper === window &&
          this.debouncedResize &&
          window.removeEventListener("resize", this.debouncedResize, !1);
    }
    resize = () => {
      this.onWrapperResize(), this.onContentResize();
    };
    onWrapperResize = () => {
      this.wrapper instanceof Window
        ? ((this.width = window.innerWidth), (this.height = window.innerHeight))
        : ((this.width = this.wrapper.clientWidth),
          (this.height = this.wrapper.clientHeight));
    };
    onContentResize = () => {
      this.wrapper instanceof Window
        ? ((this.scrollHeight = this.content.scrollHeight),
          (this.scrollWidth = this.content.scrollWidth))
        : ((this.scrollHeight = this.wrapper.scrollHeight),
          (this.scrollWidth = this.wrapper.scrollWidth));
    };
    get limit() {
      return {
        x: this.scrollWidth - this.width,
        y: this.scrollHeight - this.height,
      };
    }
  },
  s = class {
    events = {};
    emit(t, ...e) {
      let i = this.events[t] || [];
      for (let t = 0, s = i.length; t < s; t++) i[t]?.(...e);
    }
    on(t, e) {
      return (
        this.events[t]?.push(e) || (this.events[t] = [e]),
        () => {
          this.events[t] = this.events[t]?.filter((t) => e !== t);
        }
      );
    }
    off(t, e) {
      this.events[t] = this.events[t]?.filter((t) => e !== t);
    }
    destroy() {
      this.events = {};
    }
  },
  o = 100 / 6,
  n = { passive: !1 },
  r = class {
    constructor(t, e = { wheelMultiplier: 1, touchMultiplier: 1 }) {
      (this.element = t),
        (this.options = e),
        window.addEventListener("resize", this.onWindowResize, !1),
        this.onWindowResize(),
        this.element.addEventListener("wheel", this.onWheel, n),
        this.element.addEventListener("touchstart", this.onTouchStart, n),
        this.element.addEventListener("touchmove", this.onTouchMove, n),
        this.element.addEventListener("touchend", this.onTouchEnd, n);
    }
    touchStart = { x: 0, y: 0 };
    lastDelta = { x: 0, y: 0 };
    window = { width: 0, height: 0 };
    emitter = new s();
    on(t, e) {
      return this.emitter.on(t, e);
    }
    destroy() {
      this.emitter.destroy(),
        window.removeEventListener("resize", this.onWindowResize, !1),
        this.element.removeEventListener("wheel", this.onWheel, n),
        this.element.removeEventListener("touchstart", this.onTouchStart, n),
        this.element.removeEventListener("touchmove", this.onTouchMove, n),
        this.element.removeEventListener("touchend", this.onTouchEnd, n);
    }
    onTouchStart = (t) => {
      const { clientX: e, clientY: i } = t.targetTouches
        ? t.targetTouches[0]
        : t;
      (this.touchStart.x = e),
        (this.touchStart.y = i),
        (this.lastDelta = { x: 0, y: 0 }),
        this.emitter.emit("scroll", { deltaX: 0, deltaY: 0, event: t });
    };
    onTouchMove = (t) => {
      const { clientX: e, clientY: i } = t.targetTouches
          ? t.targetTouches[0]
          : t,
        s = -(e - this.touchStart.x) * this.options.touchMultiplier,
        o = -(i - this.touchStart.y) * this.options.touchMultiplier;
      (this.touchStart.x = e),
        (this.touchStart.y = i),
        (this.lastDelta = { x: s, y: o }),
        this.emitter.emit("scroll", { deltaX: s, deltaY: o, event: t });
    };
    onTouchEnd = (t) => {
      this.emitter.emit("scroll", {
        deltaX: this.lastDelta.x,
        deltaY: this.lastDelta.y,
        event: t,
      });
    };
    onWheel = (t) => {
      let { deltaX: e, deltaY: i, deltaMode: s } = t;
      (e *= 1 === s ? o : 2 === s ? this.window.width : 1),
        (i *= 1 === s ? o : 2 === s ? this.window.height : 1),
        (e *= this.options.wheelMultiplier),
        (i *= this.options.wheelMultiplier),
        this.emitter.emit("scroll", { deltaX: e, deltaY: i, event: t });
    };
    onWindowResize = () => {
      this.window = { width: window.innerWidth, height: window.innerHeight };
    };
  },
  l = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  Lenis = class {
    _isScrolling = !1;
    _isStopped = !1;
    _isLocked = !1;
    _preventNextNativeScrollEvent = !1;
    _resetVelocityTimeout = null;
    _rafId = null;
    isTouching;
    time = 0;
    userData = {};
    lastVelocity = 0;
    velocity = 0;
    direction = 0;
    options;
    targetScroll;
    animatedScroll;
    animate = new e();
    emitter = new s();
    dimensions;
    virtualScroll;
    constructor({
      wrapper: t = window,
      content: e = document.documentElement,
      eventsTarget: s = t,
      smoothWheel: o = !0,
      syncTouch: n = !1,
      syncTouchLerp: h = 0.075,
      touchInertiaExponent: a = 1.7,
      duration: c,
      easing: p,
      lerp: d = 0.1,
      infinite: u = !1,
      orientation: m = "vertical",
      gestureOrientation: v = "horizontal" === m ? "both" : "vertical",
      touchMultiplier: g = 1,
      wheelMultiplier: S = 1,
      autoResize: f = !0,
      prevent: w,
      virtualScroll: y,
      overscroll: E = !0,
      autoRaf: T = !1,
      anchors: z = !1,
      autoToggle: b = !1,
      allowNestedScroll: L = !1,
      __experimental__naiveDimensions: N = !1,
      naiveDimensions: R = N,
      stopInertiaOnNavigate: M = !1,
    } = {}) {
      (window.lenisVersion = "1.3.17"),
        (t && t !== document.documentElement) || (t = window),
        "number" == typeof c && "function" != typeof p
          ? (p = l)
          : "function" == typeof p && "number" != typeof c && (c = 1),
        (this.options = {
          wrapper: t,
          content: e,
          eventsTarget: s,
          smoothWheel: o,
          syncTouch: n,
          syncTouchLerp: h,
          touchInertiaExponent: a,
          duration: c,
          easing: p,
          lerp: d,
          infinite: u,
          gestureOrientation: v,
          orientation: m,
          touchMultiplier: g,
          wheelMultiplier: S,
          autoResize: f,
          prevent: w,
          virtualScroll: y,
          overscroll: E,
          autoRaf: T,
          anchors: z,
          autoToggle: b,
          allowNestedScroll: L,
          naiveDimensions: R,
          stopInertiaOnNavigate: M,
        }),
        (this.dimensions = new i(t, e, { autoResize: f })),
        this.updateClassName(),
        (this.targetScroll = this.animatedScroll = this.actualScroll),
        this.options.wrapper.addEventListener(
          "scroll",
          this.onNativeScroll,
          !1
        ),
        this.options.wrapper.addEventListener("scrollend", this.onScrollEnd, {
          capture: !0,
        }),
        (this.options.anchors || this.options.stopInertiaOnNavigate) &&
          this.options.wrapper.addEventListener("click", this.onClick, !1),
        this.options.wrapper.addEventListener(
          "pointerdown",
          this.onPointerDown,
          !1
        ),
        (this.virtualScroll = new r(s, {
          touchMultiplier: g,
          wheelMultiplier: S,
        })),
        this.virtualScroll.on("scroll", this.onVirtualScroll),
        this.options.autoToggle &&
          (this.checkOverflow(),
          this.rootElement.addEventListener(
            "transitionend",
            this.onTransitionEnd,
            { passive: !0 }
          )),
        this.options.autoRaf && (this._rafId = requestAnimationFrame(this.raf));
    }
    destroy() {
      this.emitter.destroy(),
        this.options.wrapper.removeEventListener(
          "scroll",
          this.onNativeScroll,
          !1
        ),
        this.options.wrapper.removeEventListener(
          "scrollend",
          this.onScrollEnd,
          { capture: !0 }
        ),
        this.options.wrapper.removeEventListener(
          "pointerdown",
          this.onPointerDown,
          !1
        ),
        (this.options.anchors || this.options.stopInertiaOnNavigate) &&
          this.options.wrapper.removeEventListener("click", this.onClick, !1),
        this.virtualScroll.destroy(),
        this.dimensions.destroy(),
        this.cleanUpClassName(),
        this._rafId && cancelAnimationFrame(this._rafId);
    }
    on(t, e) {
      return this.emitter.on(t, e);
    }
    off(t, e) {
      return this.emitter.off(t, e);
    }
    onScrollEnd = (t) => {
      t instanceof CustomEvent ||
        ("smooth" !== this.isScrolling && !1 !== this.isScrolling) ||
        t.stopPropagation();
    };
    dispatchScrollendEvent = () => {
      this.options.wrapper.dispatchEvent(
        new CustomEvent("scrollend", {
          bubbles: this.options.wrapper === window,
          detail: { lenisScrollEnd: !0 },
        })
      );
    };
    get overflow() {
      const t = this.isHorizontal ? "overflow-x" : "overflow-y";
      return getComputedStyle(this.rootElement)[t];
    }
    checkOverflow() {
      ["hidden", "clip"].includes(this.overflow)
        ? this.internalStop()
        : this.internalStart();
    }
    onTransitionEnd = (t) => {
      t.propertyName.includes("overflow") && this.checkOverflow();
    };
    setScroll(t) {
      this.isHorizontal
        ? this.options.wrapper.scrollTo({ left: t, behavior: "instant" })
        : this.options.wrapper.scrollTo({ top: t, behavior: "instant" });
    }
    onClick = (t) => {
      const e = t
        .composedPath()
        .filter(
          (t) => t instanceof HTMLAnchorElement && t.getAttribute("href")
        );
      if (this.options.anchors) {
        const t = e.find((t) => t.getAttribute("href")?.includes("#"));
        if (t) {
          const e = t.getAttribute("href");
          if (e) {
            const t =
                "object" == typeof this.options.anchors && this.options.anchors
                  ? this.options.anchors
                  : void 0,
              i = `#${e.split("#")[1]}`;
            this.scrollTo(i, t);
          }
        }
      }
      if (this.options.stopInertiaOnNavigate) {
        e.find((t) => t.host === window.location.host) && this.reset();
      }
    };
    onPointerDown = (t) => {
      1 === t.button && this.reset();
    };
    onVirtualScroll = (t) => {
      if (
        "function" == typeof this.options.virtualScroll &&
        !1 === this.options.virtualScroll(t)
      )
        return;
      const { deltaX: e, deltaY: i, event: s } = t;
      if (
        (this.emitter.emit("virtual-scroll", {
          deltaX: e,
          deltaY: i,
          event: s,
        }),
        s.ctrlKey)
      )
        return;
      if (s.lenisStopPropagation) return;
      const o = s.type.includes("touch"),
        n = s.type.includes("wheel");
      this.isTouching = "touchstart" === s.type || "touchmove" === s.type;
      const r = 0 === e && 0 === i;
      if (
        this.options.syncTouch &&
        o &&
        "touchstart" === s.type &&
        r &&
        !this.isStopped &&
        !this.isLocked
      )
        return void this.reset();
      const l =
        ("vertical" === this.options.gestureOrientation && 0 === i) ||
        ("horizontal" === this.options.gestureOrientation && 0 === e);
      if (r || l) return;
      let h = s.composedPath();
      h = h.slice(0, h.indexOf(this.rootElement));
      const a = this.options.prevent;
      if (
        h.find(
          (t) =>
            t instanceof HTMLElement &&
            (("function" == typeof a && a?.(t)) ||
              t.hasAttribute?.("data-lenis-prevent") ||
              (o && t.hasAttribute?.("data-lenis-prevent-touch")) ||
              (n && t.hasAttribute?.("data-lenis-prevent-wheel")) ||
              (this.options.allowNestedScroll &&
                this.checkNestedScroll(t, { deltaX: e, deltaY: i })))
        )
      )
        return;
      if (this.isStopped || this.isLocked)
        return void (s.cancelable && s.preventDefault());
      if (!((this.options.syncTouch && o) || (this.options.smoothWheel && n)))
        return (
          (this.isScrolling = "native"),
          this.animate.stop(),
          void (s.lenisStopPropagation = !0)
        );
      let c = i;
      "both" === this.options.gestureOrientation
        ? (c = Math.abs(i) > Math.abs(e) ? i : e)
        : "horizontal" === this.options.gestureOrientation && (c = e),
        (!this.options.overscroll ||
          this.options.infinite ||
          (this.options.wrapper !== window &&
            this.limit > 0 &&
            ((this.animatedScroll > 0 && this.animatedScroll < this.limit) ||
              (0 === this.animatedScroll && i > 0) ||
              (this.animatedScroll === this.limit && i < 0)))) &&
          (s.lenisStopPropagation = !0),
        s.cancelable && s.preventDefault();
      const p = o && this.options.syncTouch,
        d = o && "touchend" === s.type;
      d &&
        (c =
          Math.sign(this.velocity) *
          Math.pow(Math.abs(this.velocity), this.options.touchInertiaExponent)),
        this.scrollTo(this.targetScroll + c, {
          programmatic: !1,
          ...(p
            ? { lerp: d ? this.options.syncTouchLerp : 1 }
            : {
                lerp: this.options.lerp,
                duration: this.options.duration,
                easing: this.options.easing,
              }),
        });
    };
    resize() {
      this.dimensions.resize(),
        (this.animatedScroll = this.targetScroll = this.actualScroll),
        this.emit();
    }
    emit() {
      this.emitter.emit("scroll", this);
    }
    onNativeScroll = () => {
      if (
        (null !== this._resetVelocityTimeout &&
          (clearTimeout(this._resetVelocityTimeout),
          (this._resetVelocityTimeout = null)),
        this._preventNextNativeScrollEvent)
      )
        this._preventNextNativeScrollEvent = !1;
      else if (!1 === this.isScrolling || "native" === this.isScrolling) {
        const t = this.animatedScroll;
        (this.animatedScroll = this.targetScroll = this.actualScroll),
          (this.lastVelocity = this.velocity),
          (this.velocity = this.animatedScroll - t),
          (this.direction = Math.sign(this.animatedScroll - t)),
          this.isStopped || (this.isScrolling = "native"),
          this.emit(),
          0 !== this.velocity &&
            (this._resetVelocityTimeout = setTimeout(() => {
              (this.lastVelocity = this.velocity),
                (this.velocity = 0),
                (this.isScrolling = !1),
                this.emit();
            }, 400));
      }
    };
    reset() {
      (this.isLocked = !1),
        (this.isScrolling = !1),
        (this.animatedScroll = this.targetScroll = this.actualScroll),
        (this.lastVelocity = this.velocity = 0),
        this.animate.stop();
    }
    start() {
      this.isStopped &&
        (this.options.autoToggle
          ? this.rootElement.style.removeProperty("overflow")
          : this.internalStart());
    }
    internalStart() {
      this.isStopped && (this.reset(), (this.isStopped = !1), this.emit());
    }
    stop() {
      this.isStopped ||
        (this.options.autoToggle
          ? this.rootElement.style.setProperty("overflow", "clip")
          : this.internalStop());
    }
    internalStop() {
      this.isStopped || (this.reset(), (this.isStopped = !0), this.emit());
    }
    raf = (t) => {
      const e = t - (this.time || t);
      (this.time = t),
        this.animate.advance(0.001 * e),
        this.options.autoRaf && (this._rafId = requestAnimationFrame(this.raf));
    };
    scrollTo(
      e,
      {
        offset: i = 0,
        immediate: s = !1,
        lock: o = !1,
        programmatic: n = !0,
        lerp: r = n ? this.options.lerp : void 0,
        duration: h = n ? this.options.duration : void 0,
        easing: a = n ? this.options.easing : void 0,
        onStart: c,
        onComplete: p,
        force: d = !1,
        userData: u,
      } = {}
    ) {
      if ((!this.isStopped && !this.isLocked) || d) {
        if ("string" == typeof e && ["top", "left", "start", "#"].includes(e))
          e = 0;
        else if ("string" == typeof e && ["bottom", "right", "end"].includes(e))
          e = this.limit;
        else {
          let t;
          if (
            ("string" == typeof e
              ? ((t = document.querySelector(e)),
                t ||
                  ("#top" === e
                    ? (e = 0)
                    : console.warn("Lenis: Target not found", e)))
              : e instanceof HTMLElement && e?.nodeType && (t = e),
            t)
          ) {
            if (this.options.wrapper !== window) {
              const t = this.rootElement.getBoundingClientRect();
              i -= this.isHorizontal ? t.left : t.top;
            }
            const s = t.getBoundingClientRect();
            e = (this.isHorizontal ? s.left : s.top) + this.animatedScroll;
          }
        }
        if ("number" == typeof e) {
          if (((e += i), (e = Math.round(e)), this.options.infinite)) {
            if (n) {
              this.targetScroll = this.animatedScroll = this.scroll;
              const t = e - this.animatedScroll;
              t > this.limit / 2
                ? (e -= this.limit)
                : t < -this.limit / 2 && (e += this.limit);
            }
          } else e = t(0, e, this.limit);
          if (e === this.targetScroll) return c?.(this), void p?.(this);
          if (((this.userData = u ?? {}), s))
            return (
              (this.animatedScroll = this.targetScroll = e),
              this.setScroll(this.scroll),
              this.reset(),
              this.preventNextNativeScrollEvent(),
              this.emit(),
              p?.(this),
              (this.userData = {}),
              void requestAnimationFrame(() => {
                this.dispatchScrollendEvent();
              })
            );
          n || (this.targetScroll = e),
            "number" == typeof h && "function" != typeof a
              ? (a = l)
              : "function" == typeof a && "number" != typeof h && (h = 1),
            this.animate.fromTo(this.animatedScroll, e, {
              duration: h,
              easing: a,
              lerp: r,
              onStart: () => {
                o && (this.isLocked = !0),
                  (this.isScrolling = "smooth"),
                  c?.(this);
              },
              onUpdate: (t, e) => {
                (this.isScrolling = "smooth"),
                  (this.lastVelocity = this.velocity),
                  (this.velocity = t - this.animatedScroll),
                  (this.direction = Math.sign(this.velocity)),
                  (this.animatedScroll = t),
                  this.setScroll(this.scroll),
                  n && (this.targetScroll = t),
                  e || this.emit(),
                  e &&
                    (this.reset(),
                    this.emit(),
                    p?.(this),
                    (this.userData = {}),
                    requestAnimationFrame(() => {
                      this.dispatchScrollendEvent();
                    }),
                    this.preventNextNativeScrollEvent());
              },
            });
        }
      }
    }
    preventNextNativeScrollEvent() {
      (this._preventNextNativeScrollEvent = !0),
        requestAnimationFrame(() => {
          this._preventNextNativeScrollEvent = !1;
        });
    }
    checkNestedScroll(t, { deltaX: e, deltaY: i }) {
      const s = Date.now(),
        o = (t._lenis ??= {});
      let n, r, l, h, a, c, p, d;
      const u = this.options.gestureOrientation;
      if (s - (o.time ?? 0) > 2e3) {
        o.time = Date.now();
        const e = window.getComputedStyle(t);
        o.computedStyle = e;
        const i = e.overflowX,
          s = e.overflowY;
        if (
          ((n = ["auto", "overlay", "scroll"].includes(i)),
          (r = ["auto", "overlay", "scroll"].includes(s)),
          (o.hasOverflowX = n),
          (o.hasOverflowY = r),
          !n && !r)
        )
          return !1;
        if ("vertical" === u && !r) return !1;
        if ("horizontal" === u && !n) return !1;
        (a = t.scrollWidth),
          (c = t.scrollHeight),
          (p = t.clientWidth),
          (d = t.clientHeight),
          (l = a > p),
          (h = c > d),
          (o.isScrollableX = l),
          (o.isScrollableY = h),
          (o.scrollWidth = a),
          (o.scrollHeight = c),
          (o.clientWidth = p),
          (o.clientHeight = d);
      } else
        (l = o.isScrollableX),
          (h = o.isScrollableY),
          (n = o.hasOverflowX),
          (r = o.hasOverflowY),
          (a = o.scrollWidth),
          (c = o.scrollHeight),
          (p = o.clientWidth),
          (d = o.clientHeight);
      if ((!n && !r) || (!l && !h)) return !1;
      if (!("vertical" !== u || (r && h))) return !1;
      if (!("horizontal" !== u || (n && l))) return !1;
      let m, v, g, S, f, w;
      if ("horizontal" === u) m = "x";
      else if ("vertical" === u) m = "y";
      else {
        0 !== e && n && l && (m = "x"), 0 !== i && r && h && (m = "y");
      }
      if (!m) return !1;
      if ("x" === m) (v = t.scrollLeft), (g = a - p), (S = e), (f = n), (w = l);
      else {
        if ("y" !== m) return !1;
        (v = t.scrollTop), (g = c - d), (S = i), (f = r), (w = h);
      }
      return (S > 0 ? v < g : v > 0) && f && w;
    }
    get rootElement() {
      return this.options.wrapper === window
        ? document.documentElement
        : this.options.wrapper;
    }
    get limit() {
      return this.options.naiveDimensions
        ? this.isHorizontal
          ? this.rootElement.scrollWidth - this.rootElement.clientWidth
          : this.rootElement.scrollHeight - this.rootElement.clientHeight
        : this.dimensions.limit[this.isHorizontal ? "x" : "y"];
    }
    get isHorizontal() {
      return "horizontal" === this.options.orientation;
    }
    get actualScroll() {
      const t = this.options.wrapper;
      return this.isHorizontal
        ? t.scrollX ?? t.scrollLeft
        : t.scrollY ?? t.scrollTop;
    }
    get scroll() {
      return this.options.infinite
        ? ((t = this.animatedScroll), (e = this.limit), ((t % e) + e) % e)
        : this.animatedScroll;
      var t, e;
    }
    get progress() {
      return 0 === this.limit ? 1 : this.scroll / this.limit;
    }
    get isScrolling() {
      return this._isScrolling;
    }
    set isScrolling(t) {
      this._isScrolling !== t &&
        ((this._isScrolling = t), this.updateClassName());
    }
    get isStopped() {
      return this._isStopped;
    }
    set isStopped(t) {
      this._isStopped !== t && ((this._isStopped = t), this.updateClassName());
    }
    get isLocked() {
      return this._isLocked;
    }
    set isLocked(t) {
      this._isLocked !== t && ((this._isLocked = t), this.updateClassName());
    }
    get isSmooth() {
      return "smooth" === this.isScrolling;
    }
    get className() {
      let t = "lenis";
      return (
        this.options.autoToggle && (t += " lenis-autoToggle"),
        this.isStopped && (t += " lenis-stopped"),
        this.isLocked && (t += " lenis-locked"),
        this.isScrolling && (t += " lenis-scrolling"),
        "smooth" === this.isScrolling && (t += " lenis-smooth"),
        t
      );
    }
    updateClassName() {
      this.cleanUpClassName(),
        (this.rootElement.className =
          `${this.rootElement.className} ${this.className}`.trim());
    }
    cleanUpClassName() {
      this.rootElement.className = this.rootElement.className
        .replace(/lenis(-\w+)?/g, "")
        .trim();
    }
  };
(globalThis.Lenis = Lenis), (globalThis.Lenis.prototype = Lenis.prototype); //# sourceMappingURL=lenis.min.js.map

// Lenis End

// lenis insilition
  /* Option names are the Lenis 1.3.17 ones — the build inlined above.
     The previous config passed `smooth: true` and `smoothTouch: false`, which
     are Lenis 0.x spellings this version does not read at all (see the option
     destructuring around line 583: smoothWheel, syncTouch, lerp,
     wheelMultiplier, autoRaf). They happened to match the 1.x defaults, so the
     behaviour was right by accident; it is now stated properly.

     `duration` + `easing` are deliberately absent. Animate.advance() at line
     373 branches `if (this.duration && this.easing)` FIRST and only falls
     through to the lerp path otherwise — so setting lerp while duration is
     present is silently ignored. Dropping them is what actually enables
     lerp-based smoothing.

     lerp 0.085 is slightly heavier than the 0.1 default: this is a yard that
     cuts ships apart, and the scroll should read as mass. */
  const lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.9,
    smoothWheel: true,
    syncTouch: false      // native momentum on touch — better, and free
  });

  /* Published so a single engine can own the frame loop.
     js/motion.js (index.html only) sets window.__sgLenisExternal before it
     starts driving lenis.raf from gsap.ticker, and this loop retires on its
     next frame. Driving lenis.raf from both would advance the eased scroll
     position twice per frame — double scroll speed, and the easing sampled at
     the wrong times.
     The other 12 pages never set the flag, so this loop keeps them running.
     If motion.js or GSAP fails to load, the flag is never set and this stays
     the driver — the failure mode is "no GSAP", never "no scrolling". */
  window.lenis = lenis;

  function raf(time) {
    if (window.__sgLenisExternal) return;
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  // lenis insilition
