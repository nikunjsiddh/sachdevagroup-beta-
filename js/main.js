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
    $mainwindow.on("load", function () {
      $(".loader").fadeOut();
    });
    /*====================================
		scroll to top js
		======================================*/
    $mainwindow.on("scroll", function () {
      if ($(this).scrollTop() > 250) {
        $("#toTopBtn").fadeIn(200);
      } else {
        $("#toTopBtn").fadeOut(200);
      }
    });
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
        Sticky js
    ======================================*/
    var navbar = $(".header");
    var scrolled = false;
    $mainwindow.on("scroll", function () {
      if (200 < $mainwindow.scrollTop() && !scrolled) {
        navbar.addClass("sticky_menu animated fadeInDown").animate({
          "margin-top": "0px",
        });
        scrolled = true;
      }
      if (200 > $mainwindow.scrollTop() && scrolled) {
        navbar
          .removeClass("sticky_menu animated fadeInDown")
          .css("margin-top", "0px");
        scrolled = false;
      }
    });
    /*====================================
            slick nav
        ======================================*/
    var logo_path = $(".mobile-menu").data("logo");
    $("#main-menu").slicknav({
      appendTo: ".mobile-menu",
      removeClasses: true,
      label: "",
      closedSymbol: '<i class="fa fa-angle-right"><i/>',
      openedSymbol: '<i class="fa fa-angle-down"><i/>',
      brand: '<img src="' + logo_path + '" class="img-responsive" alt="logo">',
    });
    /*====================================
		main slider
		======================================*/
    $(".testy-slider").each(function () {
      var carousel = $(this),
        loop = carousel.data("loop"),
        items = carousel.data("items"),
        margin = carousel.data("margin"),
        stagePadding = carousel.data("stage-padding"),
        autoplay = carousel.data("autoplay"),
        autoplayTimeout = carousel.data("autoplay-timeout"),
        smartSpeed = carousel.data("smart-speed"),
        dots = carousel.data("dots"),
        nav = carousel.data("nav"),
        navSpeed = carousel.data("nav-speed"),
        rXsmall = carousel.data("r-x-small"),
        rXsmallNav = carousel.data("r-x-small-nav"),
        rXsmallDots = carousel.data("r-x-small-dots"),
        rXmedium = carousel.data("r-x-medium"),
        rXmediumNav = carousel.data("r-x-medium-nav"),
        rXmediumDots = carousel.data("r-x-medium-dots"),
        rSmall = carousel.data("r-small"),
        rSmallNav = carousel.data("r-small-nav"),
        rSmallDots = carousel.data("r-small-dots"),
        rMedium = carousel.data("r-medium"),
        rMediumNav = carousel.data("r-medium-nav"),
        rMediumDots = carousel.data("r-medium-dots"),
        rLarge = carousel.data("r-large"),
        rLargeNav = carousel.data("r-large-nav"),
        rLargeDots = carousel.data("r-large-dots"),
        center = carousel.data("center");
      carousel.owlCarousel({
        loop: loop ? true : false,
        items: items ? items : 1,
        lazyLoad: true,
        margin: margin ? margin : 0,
        autoplay: autoplay ? true : false,
        autoplayTimeout: autoplayTimeout ? autoplayTimeout : 1000,
        smartSpeed: smartSpeed ? smartSpeed : 250,
        dots: dots ? true : false,
        nav: nav ? true : false,
        navText: [
          "<i class='fa fa-angle-left' aria-hidden='true'></i>",
          "<i class='fa fa-angle-right' aria-hidden='true'></i>",
        ],
        navSpeed: navSpeed ? true : false,
        center: center ? true : false,
        responsiveClass: true,
        responsive: {
          0: {
            items: rXsmall ? rXsmall : 1,
            nav: rXsmallNav ? true : false,
            dots: rXsmallDots ? true : false,
          },
          480: {
            items: rXmedium ? rXmedium : 1,
            nav: rXmediumNav ? true : false,
            dots: rXmediumDots ? true : false,
          },
          768: {
            items: rSmall ? rSmall : 1,
            nav: rSmallNav ? true : false,
            dots: rSmallDots ? true : false,
          },
          992: {
            items: rMedium ? rMedium : 1,
            nav: rMediumNav ? true : false,
            dots: rMediumDots ? true : false,
          },
          1199: {
            items: rLarge ? rLarge : 1,
            nav: rLargeNav ? true : false,
            dots: rLargeDots ? true : false,
          },
        },
      });
    });
    // drinks sort
    $(".food-menu-section").imagesLoaded(function () {
      // init Isotope
      var $grid = $(".drinks-items").isotope({
        itemSelector: ".grid-item",
        percentPosition: true,
        masonry: {
          columnWidth: ".grid-item",
        },
      });
      // filter items on button click
      $(".sort-drinks").on("click", ".filter-button", function () {
        var filterValue = $(this).attr("data-filter");
        $grid.isotope({
          filter: filterValue,
        });
      });
      $(".sort-drinks li").on("click", function (event) {
        $(".filter-button").removeClass("active");
        $(this).addClass("active");
        event.preventDefault();
      });
    });
    // desserts sort
    $(".food-menu-section").imagesLoaded(function () {
      // init Isotope
      var $grid = $(".dessert-items").isotope({
        itemSelector: ".grid-item",
        percentPosition: true,
        masonry: {
          columnWidth: ".grid-item",
        },
      });
      // filter items on button click
      $(".sort-desserts").on("click", ".filter-button", function () {
        var filterValue = $(this).attr("data-filter");
        $grid.isotope({
          filter: filterValue,
        });
      });
      $(".sort-desserts li").on("click", function (event) {
        $(".filter-button").removeClass("active");
        $(this).addClass("active");
        event.preventDefault();
      });
    });
    // food slider
    var $foodslider = $(".food-slider");
    $foodslider.owlCarousel({
      margin: 0,
      items: 1,
      loop: true,
      autoplay: true,
      dots: true,
      autoplayTimeout: 5000,
      autoplaySpeed: 500,
      nav: false,
      addClassActive: false,
    });
    // food slider
    var $foodthumbslider = $(".food-thumb-slider");
    $foodthumbslider.owlCarousel({
      margin: 0,
      items: 1,
      loop: true,
      autoplay: true,
      dots: true,
      navText: [
        '<i class="fa fa-angle-left"></i>',
        '<i class="fa fa-angle-right"></i>',
      ],
      autoplayTimeout: 5000,
      autoplaySpeed: 500,
      nav: true,
      addClassActive: false,
      responsiveClass: false,
      responsive: {
        0: {
          items: 1,
        },
        600: {
          items: 2,
        },
        1000: {
          items: 3,
        },
      },
    });
    $foodthumbslider.on("change.owl.carousel", function (event) {
      $foodslider.trigger("to.owl.carousel", [event.item.index, 300, true]);
    });
    /*====================================
		    project portfolio section
		======================================*/
    $(".food-menu-section").imagesLoaded(function () {
      // init Isotope
      var $grid = $(".food-items").isotope({
        itemSelector: ".grid-item",
        percentPosition: true,
        masonry: {
          columnWidth: ".grid-item",
        },
      });
      // filter items on button click
      $(".sort-foods").on("click", ".filter-button", function () {
        var filterValue = $(this).attr("data-filter");
        $grid.isotope({
          filter: filterValue,
        });
      });
      $(".sort-foods li").on("click", function (event) {
        $(".filter-button").removeClass("active");
        $(this).addClass("active");
        event.preventDefault();
      });
    });
    /*====================================
		    gallery measonary
		======================================*/
    $(".gallery-measonary").imagesLoaded(function () {
      // init Isotope
      var $grid = $(".gal-items").isotope({
        itemSelector: ".grid-item",
        percentPosition: true,
        masonry: {
          columnWidth: ".grid-item",
        },
      });
    });
    /*====================================
		    footer pop up gallery - Magnific popup
		======================================*/
    $(".magni-link").magnificPopup({
      type: "image",
      gallery: {
        enabled: true,
      },
      zoom: {
        enabled: true,
        duration: 300,
        easing: "ease-in-out",
        opener: function (openerElement) {
          return openerElement.is("img")
            ? openerElement
            : openerElement.find("img");
        },
      },
    });
    $(".gallery-popup").magnificPopup({
      type: "image",
      gallery: {
        enabled: true,
      },
    });
    /*====================================
            Counter up
        ======================================*/
    $(".count").counterUp({
      delay: 10,
      time: 1500,
    });
  });
})(jQuery);
/*  ======================================
           Google map
        ====================================== */
if (document.getElementById("map")) {
  var myCenter = new google.maps.LatLng(-37.813628, 144.963058);

  function initialize() {
    var mapProp = {
      center: myCenter,
      scrollwheel: false,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    };
    var map = new google.maps.Map(document.getElementById("map"), mapProp);
    var marker = new google.maps.Marker({
      position: myCenter,
      animation: google.maps.Animation.BOUNCE,
      icon: "images/map-chef-icon.png",
      map: map,
    });
    marker.setMap(map);
  }
  google.maps.event.addDomListener(window, "load", initialize);
}
// map initialization code  ends

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
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    smoothTouch: false
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  // lenis insilition
