                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               /*! Sortable 1.15.6 - MIT | git://github.com/SortableJS/Sortable.git */
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    !function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t=t||self).Sortable=e()}(this,function(){"use strict";function e(e,t){var n,o=Object.keys(e);return Object.getOwnPropertySymbols&&(n=Object.getOwnPropertySymbols(e),t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),o.push.apply(o,n)),o}function I(o){for(var t=1;t<arguments.length;t++){var i=null!=arguments[t]?arguments[t]:{};t%2?e(Object(i),!0).forEach(function(t){var e,n;e=o,t=i[n=t],n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t}):Object.getOwnPropertyDescriptors?Object.defineProperties(o,Object.getOwnPropertyDescriptors(i)):e(Object(i)).forEach(function(t){Object.defineProperty(o,t,Object.getOwnPropertyDescriptor(i,t))})}return o}function o(t){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function a(){return(a=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n,o=arguments[e];for(n in o)Object.prototype.hasOwnProperty.call(o,n)&&(t[n]=o[n])}return t}).apply(this,arguments)}function i(t,e){if(null==t)return{};var n,o=function(t,e){if(null==t)return{};for(var n,o={},i=Object.keys(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||(o[n]=t[n]);return o}(t,e);if(Object.getOwnPropertySymbols)for(var i=Object.getOwnPropertySymbols(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||Object.prototype.propertyIsEnumerable.call(t,n)&&(o[n]=t[n]);return o}function r(t){return function(t){if(Array.isArray(t))return l(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(t){if("string"==typeof t)return l(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return"Map"===(n="Object"===n&&t.constructor?t.constructor.name:n)||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?l(t,e):void 0}}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function l(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,o=new Array(e);n<e;n++)o[n]=t[n];return o}function t(t){if("undefined"!=typeof window&&window.navigator)return!!navigator.userAgent.match(t)}var y=t(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i),w=t(/Edge/i),s=t(/firefox/i),u=t(/safari/i)&&!t(/chrome/i)&&!t(/android/i),c=t(/iP(ad|od|hone)/i),n=t(/chrome/i)&&t(/android/i),d={capture:!1,passive:!1};function h(t,e,n){t.addEventListener(e,n,!y&&d)}function p(t,e,n){t.removeEventListener(e,n,!y&&d)}function f(t,e){if(e&&(">"===e[0]&&(e=e.substring(1)),t))try{if(t.matches)return t.matches(e);if(t.msMatchesSelector)return t.msMatchesSelector(e);if(t.webkitMatchesSelector)return t.webkitMatchesSelector(e)}catch(t){return}}function g(t){return t.host&&t!==document&&t.host.nodeType?t.host:t.parentNode}function P(t,e,n,o){if(t){n=n||document;do{if(null!=e&&(">"!==e[0]||t.parentNode===n)&&f(t,e)||o&&t===n)return t}while(t!==n&&(t=g(t)))}return null}var m,v=/\s+/g;function k(t,e,n){var o;t&&e&&(t.classList?t.classList[n?"add":"remove"](e):(o=(" "+t.className+" ").replace(v," ").replace(" "+e+" "," "),t.className=(o+(n?" "+e:"")).replace(v," ")))}function R(t,e,n){var o=t&&t.style;if(o){if(void 0===n)return document.defaultView&&document.defaultView.getComputedStyle?n=document.defaultView.getComputedStyle(t,""):t.currentStyle&&(n=t.currentStyle),void 0===e?n:n[e];o[e=!(e in o||-1!==e.indexOf("webkit"))?"-webkit-"+e:e]=n+("string"==typeof n?"":"px")}}function b(t,e){var n="";if("string"==typeof t)n=t;else do{var o=R(t,"transform")}while(o&&"none"!==o&&(n=o+" "+n),!e&&(t=t.parentNode));var i=window.DOMMatrix||window.WebKitCSSMatrix||window.CSSMatrix||window.MSCSSMatrix;return i&&new i(n)}function D(t,e,n){if(t){var o=t.getElementsByTagName(e),i=0,r=o.length;if(n)for(;i<r;i++)n(o[i],i);return o}return[]}function O(){var t=document.scrollingElement;return t||document.documentElement}function X(t,e,n,o,i){if(t.getBoundingClientRect||t===window){var r,a,l,s,c,u,d=t!==window&&t.parentNode&&t!==O()?(a=(r=t.getBoundingClientRect()).top,l=r.left,s=r.bottom,c=r.right,u=r.height,r.width):(l=a=0,s=window.innerHeight,c=window.innerWidth,u=window.innerHeight,window.innerWidth);if((e||n)&&t!==window&&(i=i||t.parentNode,!y))do{if(i&&i.getBoundingClientRect&&("none"!==R(i,"transform")||n&&"static"!==R(i,"position"))){var h=i.getBoundingClientRect();a-=h.top+parseInt(R(i,"border-top-width")),l-=h.left+parseInt(R(i,"border-left-width")),s=a+r.height,c=l+r.width;break}}while(i=i.parentNode);return o&&t!==window&&(o=(e=b(i||t))&&e.a,t=e&&e.d,e&&(s=(a/=t)+(u/=t),c=(l/=o)+(d/=o))),{top:a,left:l,bottom:s,right:c,width:d,height:u}}}function Y(t,e,n){for(var o=M(t,!0),i=X(t)[e];o;){var r=X(o)[n];if(!("top"===n||"left"===n?r<=i:i<=r))return o;if(o===O())break;o=M(o,!1)}return!1}function B(t,e,n,o){for(var i=0,r=0,a=t.children;r<a.length;){if("none"!==a[r].style.display&&a[r]!==jt.ghost&&(o||a[r]!==jt.dragged)&&P(a[r],n.draggable,t,!1)){if(i===e)return a[r];i++}r++}return null}function F(t,e){for(var n=t.lastElementChild;n&&(n===jt.ghost||"none"===R(n,"display")||e&&!f(n,e));)n=n.previousElementSibling;return n||null}function j(t,e){var n=0;if(!t||!t.parentNode)return-1;for(;t=t.previousElementSibling;)"TEMPLATE"===t.nodeName.toUpperCase()||t===jt.clone||e&&!f(t,e)||n++;return n}function E(t){var e=0,n=0,o=O();if(t)do{var i=b(t),r=i.a,i=i.d}while(e+=t.scrollLeft*r,n+=t.scrollTop*i,t!==o&&(t=t.parentNode));return[e,n]}function M(t,e){if(!t||!t.getBoundingClientRect)return O();var n=t,o=!1;do{if(n.clientWidth<n.scrollWidth||n.clientHeight<n.scrollHeight){var i=R(n);if(n.clientWidth<n.scrollWidth&&("auto"==i.overflowX||"scroll"==i.overflowX)||n.clientHeight<n.scrollHeight&&("auto"==i.overflowY||"scroll"==i.overflowY)){if(!n.getBoundingClientRect||n===document.body)return O();if(o||e)return n;o=!0}}}while(n=n.parentNode);return O()}function S(t,e){return Math.round(t.top)===Math.round(e.top)&&Math.round(t.left)===Math.round(e.left)&&Math.round(t.height)===Math.round(e.height)&&Math.round(t.width)===Math.round(e.width)}function _(e,n){return function(){var t;m||(1===(t=arguments).length?e.call(this,t[0]):e.apply(this,t),m=setTimeout(function(){m=void 0},n))}}function H(t,e,n){t.scrollLeft+=e,t.scrollTop+=n}function C(t){var e=window.Polymer,n=window.jQuery||window.Zepto;return e&&e.dom?e.dom(t).cloneNode(!0):n?n(t).clone(!0)[0]:t.cloneNode(!0)}function T(t,e){R(t,"position","absolute"),R(t,"top",e.top),R(t,"left",e.left),R(t,"width",e.width),R(t,"height",e.height)}function x(t){R(t,"position",""),R(t,"top",""),R(t,"left",""),R(t,"width",""),R(t,"height","")}function L(n,o,i){var r={};return Array.from(n.children).forEach(function(t){var e;P(t,o.draggable,n,!1)&&!t.animated&&t!==i&&(e=X(t),r.left=Math.min(null!==(t=r.left)&&void 0!==t?t:1/0,e.left),r.top=Math.min(null!==(t=r.top)&&void 0!==t?t:1/0,e.top),r.right=Math.max(null!==(t=r.right)&&void 0!==t?t:-1/0,e.right),r.bottom=Math.max(null!==(t=r.bottom)&&void 0!==t?t:-1/0,e.bottom))}),r.width=r.right-r.left,r.height=r.bottom-r.top,r.x=r.left,r.y=r.top,r}var K="Sortable"+(new Date).getTime();function A(){var e,o=[];return{captureAnimationState:function(){o=[],this.options.animation&&[].slice.call(this.el.children).forEach(function(t){var e,n;"none"!==R(t,"display")&&t!==jt.ghost&&(o.push({target:t,rect:X(t)}),e=I({},o[o.length-1].rect),!t.thisAnimationDuration||(n=b(t,!0))&&(e.top-=n.f,e.left-=n.e),t.fromRect=e)})},addAnimationState:function(t){o.push(t)},removeAnimationState:function(t){o.splice(function(t,e){for(var n in t)if(t.hasOwnProperty(n))for(var o in e)if(e.hasOwnProperty(o)&&e[o]===t[n][o])return Number(n);return-1}(o,{target:t}),1)},animateAll:function(t){var c=this;if(!this.options.animation)return clearTimeout(e),void("function"==typeof t&&t());var u=!1,d=0;o.forEach(function(t){var e=0,n=t.target,o=n.fromRect,i=X(n),r=n.prevFromRect,a=n.prevToRect,l=t.rect,s=b(n,!0);s&&(i.top-=s.f,i.left-=s.e),n.toRect=i,n.thisAnimationDuration&&S(r,i)&&!S(o,i)&&(l.top-i.top)/(l.left-i.left)==(o.top-i.top)/(o.left-i.left)&&(t=l,s=r,r=a,a=c.options,e=Math.sqrt(Math.pow(s.top-t.top,2)+Math.pow(s.left-t.left,2))/Math.sqrt(Math.pow(s.top-r.top,2)+Math.pow(s.left-r.left,2))*a.animation),S(i,o)||(n.prevFromRect=o,n.prevToRect=i,e=e||c.options.animation,c.animate(n,l,i,e)),e&&(u=!0,d=Math.max(d,e),clearTimeout(n.animationResetTimer),n.animationResetTimer=setTimeout(function(){n.animationTime=0,n.prevFromRect=null,n.fromRect=null,n.prevToRect=null,n.thisAnimationDuration=null},e),n.thisAnimationDuration=e)}),clearTimeout(e),u?e=setTimeout(function(){"function"==typeof t&&t()},d):"function"==typeof t&&t(),o=[]},animate:function(t,e,n,o){var i,r;o&&(R(t,"transition",""),R(t,"transform",""),i=(r=b(this.el))&&r.a,r=r&&r.d,i=(e.left-n.left)/(i||1),r=(e.top-n.top)/(r||1),t.animatingX=!!i,t.animatingY=!!r,R(t,"transform","translate3d("+i+"px,"+r+"px,0)"),this.forRepaintDummy=t.offsetWidth,R(t,"transition","transform "+o+"ms"+(this.options.easing?" "+this.options.easing:"")),R(t,"transform","translate3d(0,0,0)"),"number"==typeof t.animated&&clearTimeout(t.animated),t.animated=setTimeout(function(){R(t,"transition",""),R(t,"transform",""),t.animated=!1,t.animatingX=!1,t.animatingY=!1},o))}}}var N=[],W={initializeByDefault:!0},z={mount:function(e){for(var t in W)!W.hasOwnProperty(t)||t in e||(e[t]=W[t]);N.forEach(function(t){if(t.pluginName===e.pluginName)throw"Sortable: Cannot mount plugin ".concat(e.pluginName," more than once")}),N.push(e)},pluginEvent:function(e,n,o){var t=this;this.eventCanceled=!1,o.cancel=function(){t.eventCanceled=!0};var i=e+"Global";N.forEach(function(t){n[t.pluginName]&&(n[t.pluginName][i]&&n[t.pluginName][i](I({sortable:n},o)),n.options[t.pluginName]&&n[t.pluginName][e]&&n[t.pluginName][e](I({sortable:n},o)))})},initializePlugins:function(n,o,i,t){for(var e in N.forEach(function(t){var e=t.pluginName;(n.options[e]||t.initializeByDefault)&&((t=new t(n,o,n.options)).sortable=n,t.options=n.options,n[e]=t,a(i,t.defaults))}),n.options){var r;n.options.hasOwnProperty(e)&&(void 0!==(r=this.modifyOption(n,e,n.options[e]))&&(n.options[e]=r))}},getEventProperties:function(e,n){var o={};return N.forEach(function(t){"function"==typeof t.eventProperties&&a(o,t.eventProperties.call(n[t.pluginName],e))}),o},modifyOption:function(e,n,o){var i;return N.forEach(function(t){e[t.pluginName]&&t.optionListeners&&"function"==typeof t.optionListeners[n]&&(i=t.optionListeners[n].call(e[t.pluginName],o))}),i}};function G(t){var e=t.sortable,n=t.rootEl,o=t.name,i=t.targetEl,r=t.cloneEl,a=t.toEl,l=t.fromEl,s=t.oldIndex,c=t.newIndex,u=t.oldDraggableIndex,d=t.newDraggableIndex,h=t.originalEvent,p=t.putSortable,f=t.extraEventProperties;if(e=e||n&&n[K]){var g,m=e.options,t="on"+o.charAt(0).toUpperCase()+o.substr(1);!window.CustomEvent||y||w?(g=document.createEvent("Event")).initEvent(o,!0,!0):g=new CustomEvent(o,{bubbles:!0,cancelable:!0}),g.to=a||n,g.from=l||n,g.item=i||n,g.clone=r,g.oldIndex=s,g.newIndex=c,g.oldDraggableIndex=u,g.newDraggableIndex=d,g.originalEvent=h,g.pullMode=p?p.lastPutMode:void 0;var v,b=I(I({},f),z.getEventProperties(o,e));for(v in b)g[v]=b[v];n&&n.dispatchEvent(g),m[t]&&m[t].call(e,g)}}function U(t,e){var n=(o=2<arguments.length&&void 0!==arguments[2]?arguments[2]:{}).evt,o=i(o,q);z.pluginEvent.bind(jt)(t,e,I({dragEl:Z,parentEl:$,ghostEl:Q,rootEl:J,nextEl:tt,lastDownEl:et,cloneEl:nt,cloneHidden:ot,dragStarted:mt,putSortable:ct,activeSortable:jt.active,originalEvent:n,oldIndex:it,oldDraggableIndex:at,newIndex:rt,newDraggableIndex:lt,hideGhostForTarget:Xt,unhideGhostForTarget:Yt,cloneNowHidden:function(){ot=!0},cloneNowShown:function(){ot=!1},dispatchSortableEvent:function(t){V({sortable:e,name:t,originalEvent:n})}},o))}var q=["evt"];function V(t){G(I({putSortable:ct,cloneEl:nt,targetEl:Z,rootEl:J,oldIndex:it,oldDraggableIndex:at,newIndex:rt,newDraggableIndex:lt},t))}var Z,$,Q,J,tt,et,nt,ot,it,rt,at,lt,st,ct,ut,dt,ht,pt,ft,gt,mt,vt,bt,yt,wt,Dt=!1,Et=!1,St=[],_t=!1,Ct=!1,Tt=[],xt=!1,Ot=[],Mt="undefined"!=typeof document,At=c,Nt=w||y?"cssFloat":"float",It=Mt&&!n&&!c&&"draggable"in document.createElement("div"),Pt=function(){if(Mt){if(y)return!1;var t=document.createElement("x");return t.style.cssText="pointer-events:auto","auto"===t.style.pointerEvents}}(),kt=function(t,e){var n=R(t),o=parseInt(n.width)-parseInt(n.paddingLeft)-parseInt(n.paddingRight)-parseInt(n.borderLeftWidth)-parseInt(n.borderRightWidth),i=B(t,0,e),r=B(t,1,e),a=i&&R(i),l=r&&R(r),s=a&&parseInt(a.marginLeft)+parseInt(a.marginRight)+X(i).width,t=l&&parseInt(l.marginLeft)+parseInt(l.marginRight)+X(r).width;if("flex"===n.display)return"column"===n.flexDirection||"column-reverse"===n.flexDirection?"vertical":"horizontal";if("grid"===n.display)return n.gridTemplateColumns.split(" ").length<=1?"vertical":"horizontal";if(i&&a.float&&"none"!==a.float){e="left"===a.float?"left":"right";return!r||"both"!==l.clear&&l.clear!==e?"horizontal":"vertical"}return i&&("block"===a.display||"flex"===a.display||"table"===a.display||"grid"===a.display||o<=s&&"none"===n[Nt]||r&&"none"===n[Nt]&&o<s+t)?"vertical":"horizontal"},Rt=function(t){function l(r,a){return function(t,e,n,o){var i=t.options.group.name&&e.options.group.name&&t.options.group.name===e.options.group.name;if(null==r&&(a||i))return!0;if(null==r||!1===r)return!1;if(a&&"clone"===r)return r;if("function"==typeof r)return l(r(t,e,n,o),a)(t,e,n,o);e=(a?t:e).options.group.name;return!0===r||"string"==typeof r&&r===e||r.join&&-1<r.indexOf(e)}}var e={},n=t.group;n&&"object"==o(n)||(n={name:n}),e.name=n.name,e.checkPull=l(n.pull,!0),e.checkPut=l(n.put),e.revertClone=n.revertClone,t.group=e},Xt=function(){!Pt&&Q&&R(Q,"display","none")},Yt=function(){!Pt&&Q&&R(Q,"display","")};Mt&&!n&&document.addEventListener("click",function(t){if(Et)return t.preventDefault(),t.stopPropagation&&t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation(),Et=!1},!0);function Bt(t){if(Z){t=t.touches?t.touches[0]:t;var e=(i=t.clientX,r=t.clientY,St.some(function(t){var e=t[K].options.emptyInsertThreshold;if(e&&!F(t)){var n=X(t),o=i>=n.left-e&&i<=n.right+e,e=r>=n.top-e&&r<=n.bottom+e;return o&&e?a=t:void 0}}),a);if(e){var n,o={};for(n in t)t.hasOwnProperty(n)&&(o[n]=t[n]);o.target=o.rootEl=e,o.preventDefault=void 0,o.stopPropagation=void 0,e[K]._onDragOver(o)}}var i,r,a}function Ft(t){Z&&Z.parentNode[K]._isOutsideThisEl(t.target)}function jt(t,e){if(!t||!t.nodeType||1!==t.nodeType)throw"Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(t));this.el=t,this.options=e=a({},e),t[K]=this;var n,o,i={group:null,sort:!0,disabled:!1,store:null,handle:null,draggable:/^[uo]l$/i.test(t.nodeName)?">li":">*",swapThreshold:1,invertSwap:!1,invertedSwapThreshold:null,removeCloneOnHide:!0,direction:function(){return kt(t,this.options)},ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",dragClass:"sortable-drag",ignore:"a, img",filter:null,preventOnFilter:!0,animation:0,easing:null,setData:function(t,e){t.setData("Text",e.textContent)},dropBubble:!1,dragoverBubble:!1,dataIdAttr:"data-id",delay:0,delayOnTouchOnly:!1,touchStartThreshold:(Number.parseInt?Number:window).parseInt(window.devicePixelRatio,10)||1,forceFallback:!1,fallbackClass:"sortable-fallback",fallbackOnBody:!1,fallbackTolerance:0,fallbackOffset:{x:0,y:0},supportPointer:!1!==jt.supportPointer&&"PointerEvent"in window&&(!u||c),emptyInsertThreshold:5};for(n in z.initializePlugins(this,t,i),i)n in e||(e[n]=i[n]);for(o in Rt(e),this)"_"===o.charAt(0)&&"function"==typeof this[o]&&(this[o]=this[o].bind(this));this.nativeDraggable=!e.forceFallback&&It,this.nativeDraggable&&(this.options.touchStartThreshold=1),e.supportPointer?h(t,"pointerdown",this._onTapStart):(h(t,"mousedown",this._onTapStart),h(t,"touchstart",this._onTapStart)),this.nativeDraggable&&(h(t,"dragover",this),h(t,"dragenter",this)),St.push(this.el),e.store&&e.store.get&&this.sort(e.store.get(this)||[]),a(this,A())}function Ht(t,e,n,o,i,r,a,l){var s,c,u=t[K],d=u.options.onMove;return!window.CustomEvent||y||w?(s=document.createEvent("Event")).initEvent("move",!0,!0):s=new CustomEvent("move",{bubbles:!0,cancelable:!0}),s.to=e,s.from=t,s.dragged=n,s.draggedRect=o,s.related=i||e,s.relatedRect=r||X(e),s.willInsertAfter=l,s.originalEvent=a,t.dispatchEvent(s),c=d?d.call(u,s,a):c}function Lt(t){t.draggable=!1}function Kt(){xt=!1}function Wt(t){return setTimeout(t,0)}function zt(t){return clearTimeout(t)}jt.prototype={constructor:jt,_isOutsideThisEl:function(t){this.el.contains(t)||t===this.el||(vt=null)},_getDirection:function(t,e){return"function"==typeof this.options.direction?this.options.direction.call(this,t,e,Z):this.options.direction},_onTapStart:function(e){if(e.cancelable){var n=this,o=this.el,t=this.options,i=t.preventOnFilter,r=e.type,a=e.touches&&e.touches[0]||e.pointerType&&"touch"===e.pointerType&&e,l=(a||e).target,s=e.target.shadowRoot&&(e.path&&e.path[0]||e.composedPath&&e.composedPath()[0])||l,c=t.filter;if(!function(t){Ot.length=0;var e=t.getElementsByTagName("input"),n=e.length;for(;n--;){var o=e[n];o.checked&&Ot.push(o)}}(o),!Z&&!(/mousedown|pointerdown/.test(r)&&0!==e.button||t.disabled)&&!s.isContentEditable&&(this.nativeDraggable||!u||!l||"SELECT"!==l.tagName.toUpperCase())&&!((l=P(l,t.draggable,o,!1))&&l.animated||et===l)){if(it=j(l),at=j(l,t.draggable),"function"==typeof c){if(c.call(this,e,l,this))return V({sortable:n,rootEl:s,name:"filter",targetEl:l,toEl:o,fromEl:o}),U("filter",n,{evt:e}),void(i&&e.preventDefault())}else if(c=c&&c.split(",").some(function(t){if(t=P(s,t.trim(),o,!1))return V({sortable:n,rootEl:t,name:"filter",targetEl:l,fromEl:o,toEl:o}),U("filter",n,{evt:e}),!0}))return void(i&&e.preventDefault());t.handle&&!P(s,t.handle,o,!1)||this._prepareDragStart(e,a,l)}}},_prepareDragStart:function(t,e,n){var o,i=this,r=i.el,a=i.options,l=r.ownerDocument;n&&!Z&&n.parentNode===r&&(o=X(n),J=r,$=(Z=n).parentNode,tt=Z.nextSibling,et=n,st=a.group,ut={target:jt.dragged=Z,clientX:(e||t).clientX,clientY:(e||t).clientY},ft=ut.clientX-o.left,gt=ut.clientY-o.top,this._lastX=(e||t).clientX,this._lastY=(e||t).clientY,Z.style["will-change"]="all",o=function(){U("delayEnded",i,{evt:t}),jt.eventCanceled?i._onDrop():(i._disableDelayedDragEvents(),!s&&i.nativeDraggable&&(Z.draggable=!0),i._triggerDragStart(t,e),V({sortable:i,name:"choose",originalEvent:t}),k(Z,a.chosenClass,!0))},a.ignore.split(",").forEach(function(t){D(Z,t.trim(),Lt)}),h(l,"dragover",Bt),h(l,"mousemove",Bt),h(l,"touchmove",Bt),a.supportPointer?(h(l,"pointerup",i._onDrop),this.nativeDraggable||h(l,"pointercancel",i._onDrop)):(h(l,"mouseup",i._onDrop),h(l,"touchend",i._onDrop),h(l,"touchcancel",i._onDrop)),s&&this.nativeDraggable&&(this.options.touchStartThreshold=4,Z.draggable=!0),U("delayStart",this,{evt:t}),!a.delay||a.delayOnTouchOnly&&!e||this.nativeDraggable&&(w||y)?o():jt.eventCanceled?this._onDrop():(a.supportPointer?(h(l,"pointerup",i._disableDelayedDrag),h(l,"pointercancel",i._disableDelayedDrag)):(h(l,"mouseup",i._disableDelayedDrag),h(l,"touchend",i._disableDelayedDrag),h(l,"touchcancel",i._disableDelayedDrag)),h(l,"mousemove",i._delayedDragTouchMoveHandler),h(l,"touchmove",i._delayedDragTouchMoveHandler),a.supportPointer&&h(l,"pointermove",i._delayedDragTouchMoveHandler),i._dragStartTimer=setTimeout(o,a.delay)))},_delayedDragTouchMoveHandler:function(t){t=t.touches?t.touches[0]:t;Math.max(Math.abs(t.clientX-this._lastX),Math.abs(t.clientY-this._lastY))>=Math.floor(this.options.touchStartThreshold/(this.nativeDraggable&&window.devicePixelRatio||1))&&this._disableDelayedDrag()},_disableDelayedDrag:function(){Z&&Lt(Z),clearTimeout(this._dragStartTimer),this._disableDelayedDragEvents()},_disableDelayedDragEvents:function(){var t=this.el.ownerDocument;p(t,"mouseup",this._disableDelayedDrag),p(t,"touchend",this._disableDelayedDrag),p(t,"touchcancel",this._disableDelayedDrag),p(t,"pointerup",this._disableDelayedDrag),p(t,"pointercancel",this._disableDelayedDrag),p(t,"mousemove",this._delayedDragTouchMoveHandler),p(t,"touchmove",this._delayedDragTouchMoveHandler),p(t,"pointermove",this._delayedDragTouchMoveHandler)},_triggerDragStart:function(t,e){e=e||"touch"==t.pointerType&&t,!this.nativeDraggable||e?this.options.supportPointer?h(document,"pointermove",this._onTouchMove):h(document,e?"touchmove":"mousemove",this._onTouchMove):(h(Z,"dragend",this),h(J,"dragstart",this._onDragStart));try{document.selection?Wt(function(){document.selection.empty()}):window.getSelection().removeAllRanges()}catch(t){}},_dragStarted:function(t,e){var n;Dt=!1,J&&Z?(U("dragStarted",this,{evt:e}),this.nativeDraggable&&h(document,"dragover",Ft),n=this.options,t||k(Z,n.dragClass,!1),k(Z,n.ghostClass,!0),jt.active=this,t&&this._appendGhost(),V({sortable:this,name:"start",originalEvent:e})):this._nulling()},_emulateDragOver:function(){if(dt){this._lastX=dt.clientX,this._lastY=dt.clientY,Xt();for(var t=document.elementFromPoint(dt.clientX,dt.clientY),e=t;t&&t.shadowRoot&&(t=t.shadowRoot.elementFromPoint(dt.clientX,dt.clientY))!==e;)e=t;if(Z.parentNode[K]._isOutsideThisEl(t),e)do{if(e[K])if(e[K]._onDragOver({clientX:dt.clientX,clientY:dt.clientY,target:t,rootEl:e})&&!this.options.dragoverBubble)break}while(e=g(t=e));Yt()}},_onTouchMove:function(t){if(ut){var e=this.options,n=e.fallbackTolerance,o=e.fallbackOffset,i=t.touches?t.touches[0]:t,r=Q&&b(Q,!0),a=Q&&r&&r.a,l=Q&&r&&r.d,e=At&&wt&&E(wt),a=(i.clientX-ut.clientX+o.x)/(a||1)+(e?e[0]-Tt[0]:0)/(a||1),l=(i.clientY-ut.clientY+o.y)/(l||1)+(e?e[1]-Tt[1]:0)/(l||1);if(!jt.active&&!Dt){if(n&&Math.max(Math.abs(i.clientX-this._lastX),Math.abs(i.clientY-this._lastY))<n)return;this._onDragStart(t,!0)}Q&&(r?(r.e+=a-(ht||0),r.f+=l-(pt||0)):r={a:1,b:0,c:0,d:1,e:a,f:l},r="matrix(".concat(r.a,",").concat(r.b,",").concat(r.c,",").concat(r.d,",").concat(r.e,",").concat(r.f,")"),R(Q,"webkitTransform",r),R(Q,"mozTransform",r),R(Q,"msTransform",r),R(Q,"transform",r),ht=a,pt=l,dt=i),t.cancelable&&t.preventDefault()}},_appendGhost:function(){if(!Q){var t=this.options.fallbackOnBody?document.body:J,e=X(Z,!0,At,!0,t),n=this.options;if(At){for(wt=t;"static"===R(wt,"position")&&"none"===R(wt,"transform")&&wt!==document;)wt=wt.parentNode;wt!==document.body&&wt!==document.documentElement?(wt===document&&(wt=O()),e.top+=wt.scrollTop,e.left+=wt.scrollLeft):wt=O(),Tt=E(wt)}k(Q=Z.cloneNode(!0),n.ghostClass,!1),k(Q,n.fallbackClass,!0),k(Q,n.dragClass,!0),R(Q,"transition",""),R(Q,"transform",""),R(Q,"box-sizing","border-box"),R(Q,"margin",0),R(Q,"top",e.top),R(Q,"left",e.left),R(Q,"width",e.width),R(Q,"height",e.height),R(Q,"opacity","0.8"),R(Q,"position",At?"absolute":"fixed"),R(Q,"zIndex","100000"),R(Q,"pointerEvents","none"),jt.ghost=Q,t.appendChild(Q),R(Q,"transform-origin",ft/parseInt(Q.style.width)*100+"% "+gt/parseInt(Q.style.height)*100+"%")}},_onDragStart:function(t,e){var n=this,o=t.dataTransfer,i=n.options;U("dragStart",this,{evt:t}),jt.eventCanceled?this._onDrop():(U("setupClone",this),jt.eventCanceled||((nt=C(Z)).removeAttribute("id"),nt.draggable=!1,nt.style["will-change"]="",this._hideClone(),k(nt,this.options.chosenClass,!1),jt.clone=nt),n.cloneId=Wt(function(){U("clone",n),jt.eventCanceled||(n.options.removeCloneOnHide||J.insertBefore(nt,Z),n._hideClone(),V({sortable:n,name:"clone"}))}),e||k(Z,i.dragClass,!0),e?(Et=!0,n._loopId=setInterval(n._emulateDragOver,50)):(p(document,"mouseup",n._onDrop),p(document,"touchend",n._onDrop),p(document,"touchcancel",n._onDrop),o&&(o.effectAllowed="move",i.setData&&i.setData.call(n,o,Z)),h(document,"drop",n),R(Z,"transform","translateZ(0)")),Dt=!0,n._dragStartId=Wt(n._dragStarted.bind(n,e,t)),h(document,"selectstart",n),mt=!0,window.getSelection().removeAllRanges(),u&&R(document.body,"user-select","none"))},_onDragOver:function(n){var o,i,r,t,e,a=this.el,l=n.target,s=this.options,c=s.group,u=jt.active,d=st===c,h=s.sort,p=ct||u,f=this,g=!1;if(!xt){if(void 0!==n.preventDefault&&n.cancelable&&n.preventDefault(),l=P(l,s.draggable,a,!0),O("dragOver"),jt.eventCanceled)return g;if(Z.contains(n.target)||l.animated&&l.animatingX&&l.animatingY||f._ignoreWhileAnimating===l)return A(!1);if(Et=!1,u&&!s.disabled&&(d?h||(i=$!==J):ct===this||(this.lastPutMode=st.checkPull(this,u,Z,n))&&c.checkPut(this,u,Z,n))){if(r="vertical"===this._getDirection(n,l),o=X(Z),O("dragOverValid"),jt.eventCanceled)return g;if(i)return $=J,M(),this._hideClone(),O("revert"),jt.eventCanceled||(tt?J.insertBefore(Z,tt):J.appendChild(Z)),A(!0);var m=F(a,s.draggable);if(m&&(S=n,c=r,x=X(F((E=this).el,E.options.draggable)),E=L(E.el,E.options,Q),!(c?S.clientX>E.right+10||S.clientY>x.bottom&&S.clientX>x.left:S.clientY>E.bottom+10||S.clientX>x.right&&S.clientY>x.top)||m.animated)){if(m&&(t=n,e=r,C=X(B((_=this).el,0,_.options,!0)),_=L(_.el,_.options,Q),e?t.clientX<_.left-10||t.clientY<C.top&&t.clientX<C.right:t.clientY<_.top-10||t.clientY<C.bottom&&t.clientX<C.left)){var v=B(a,0,s,!0);if(v===Z)return A(!1);if(D=X(l=v),!1!==Ht(J,a,Z,o,l,D,n,!1))return M(),a.insertBefore(Z,v),$=a,N(),A(!0)}else if(l.parentNode===a){var b,y,w,D=X(l),E=Z.parentNode!==a,S=(S=Z.animated&&Z.toRect||o,x=l.animated&&l.toRect||D,_=(e=r)?S.left:S.top,t=e?S.right:S.bottom,C=e?S.width:S.height,v=e?x.left:x.top,S=e?x.right:x.bottom,x=e?x.width:x.height,!(_===v||t===S||_+C/2===v+x/2)),_=r?"top":"left",C=Y(l,"top","top")||Y(Z,"top","top"),v=C?C.scrollTop:void 0;if(vt!==l&&(y=D[_],_t=!1,Ct=!S&&s.invertSwap||E),0!==(b=function(t,e,n,o,i,r,a,l){var s=o?t.clientY:t.clientX,c=o?n.height:n.width,t=o?n.top:n.left,o=o?n.bottom:n.right,n=!1;if(!a)if(l&&yt<c*i){if(_t=!_t&&(1===bt?t+c*r/2<s:s<o-c*r/2)?!0:_t)n=!0;else if(1===bt?s<t+yt:o-yt<s)return-bt}else if(t+c*(1-i)/2<s&&s<o-c*(1-i)/2)return function(t){return j(Z)<j(t)?1:-1}(e);if((n=n||a)&&(s<t+c*r/2||o-c*r/2<s))return t+c/2<s?1:-1;return 0}(n,l,D,r,S?1:s.swapThreshold,null==s.invertedSwapThreshold?s.swapThreshold:s.invertedSwapThreshold,Ct,vt===l)))for(var T=j(Z);(w=$.children[T-=b])&&("none"===R(w,"display")||w===Q););if(0===b||w===l)return A(!1);bt=b;var x=(vt=l).nextElementSibling,E=!1,S=Ht(J,a,Z,o,l,D,n,E=1===b);if(!1!==S)return 1!==S&&-1!==S||(E=1===S),xt=!0,setTimeout(Kt,30),M(),E&&!x?a.appendChild(Z):l.parentNode.insertBefore(Z,E?x:l),C&&H(C,0,v-C.scrollTop),$=Z.parentNode,void 0===y||Ct||(yt=Math.abs(y-X(l)[_])),N(),A(!0)}}else{if(m===Z)return A(!1);if((l=m&&a===n.target?m:l)&&(D=X(l)),!1!==Ht(J,a,Z,o,l,D,n,!!l))return M(),m&&m.nextSibling?a.insertBefore(Z,m.nextSibling):a.appendChild(Z),$=a,N(),A(!0)}if(a.contains(Z))return A(!1)}return!1}function O(t,e){U(t,f,I({evt:n,isOwner:d,axis:r?"vertical":"horizontal",revert:i,dragRect:o,targetRect:D,canSort:h,fromSortable:p,target:l,completed:A,onMove:function(t,e){return Ht(J,a,Z,o,t,X(t),n,e)},changed:N},e))}function M(){O("dragOverAnimationCapture"),f.captureAnimationState(),f!==p&&p.captureAnimationState()}function A(t){return O("dragOverCompleted",{insertion:t}),t&&(d?u._hideClone():u._showClone(f),f!==p&&(k(Z,(ct||u).options.ghostClass,!1),k(Z,s.ghostClass,!0)),ct!==f&&f!==jt.active?ct=f:f===jt.active&&ct&&(ct=null),p===f&&(f._ignoreWhileAnimating=l),f.animateAll(function(){O("dragOverAnimationComplete"),f._ignoreWhileAnimating=null}),f!==p&&(p.animateAll(),p._ignoreWhileAnimating=null)),(l===Z&&!Z.animated||l===a&&!l.animated)&&(vt=null),s.dragoverBubble||n.rootEl||l===document||(Z.parentNode[K]._isOutsideThisEl(n.target),t||Bt(n)),!s.dragoverBubble&&n.stopPropagation&&n.stopPropagation(),g=!0}function N(){rt=j(Z),lt=j(Z,s.draggable),V({sortable:f,name:"change",toEl:a,newIndex:rt,newDraggableIndex:lt,originalEvent:n})}},_ignoreWhileAnimating:null,_offMoveEvents:function(){p(document,"mousemove",this._onTouchMove),p(document,"touchmove",this._onTouchMove),p(document,"pointermove",this._onTouchMove),p(document,"dragover",Bt),p(document,"mousemove",Bt),p(document,"touchmove",Bt)},_offUpEvents:function(){var t=this.el.ownerDocument;p(t,"mouseup",this._onDrop),p(t,"touchend",this._onDrop),p(t,"pointerup",this._onDrop),p(t,"pointercancel",this._onDrop),p(t,"touchcancel",this._onDrop),p(document,"selectstart",this)},_onDrop:function(t){var e=this.el,n=this.options;rt=j(Z),lt=j(Z,n.draggable),U("drop",this,{evt:t}),$=Z&&Z.parentNode,rt=j(Z),lt=j(Z,n.draggable),jt.eventCanceled||(_t=Ct=Dt=!1,clearInterval(this._loopId),clearTimeout(this._dragStartTimer),zt(this.cloneId),zt(this._dragStartId),this.nativeDraggable&&(p(document,"drop",this),p(e,"dragstart",this._onDragStart)),this._offMoveEvents(),this._offUpEvents(),u&&R(document.body,"user-select",""),R(Z,"transform",""),t&&(mt&&(t.cancelable&&t.preventDefault(),n.dropBubble||t.stopPropagation()),Q&&Q.parentNode&&Q.parentNode.removeChild(Q),(J===$||ct&&"clone"!==ct.lastPutMode)&&nt&&nt.parentNode&&nt.parentNode.removeChild(nt),Z&&(this.nativeDraggable&&p(Z,"dragend",this),Lt(Z),Z.style["will-change"]="",mt&&!Dt&&k(Z,(ct||this).options.ghostClass,!1),k(Z,this.options.chosenClass,!1),V({sortable:this,name:"unchoose",toEl:$,newIndex:null,newDraggableIndex:null,originalEvent:t}),J!==$?(0<=rt&&(V({rootEl:$,name:"add",toEl:$,fromEl:J,originalEvent:t}),V({sortable:this,name:"remove",toEl:$,originalEvent:t}),V({rootEl:$,name:"sort",toEl:$,fromEl:J,originalEvent:t}),V({sortable:this,name:"sort",toEl:$,originalEvent:t})),ct&&ct.save()):rt!==it&&0<=rt&&(V({sortable:this,name:"update",toEl:$,originalEvent:t}),V({sortable:this,name:"sort",toEl:$,originalEvent:t})),jt.active&&(null!=rt&&-1!==rt||(rt=it,lt=at),V({sortable:this,name:"end",toEl:$,originalEvent:t}),this.save())))),this._nulling()},_nulling:function(){U("nulling",this),J=Z=$=Q=tt=nt=et=ot=ut=dt=mt=rt=lt=it=at=vt=bt=ct=st=jt.dragged=jt.ghost=jt.clone=jt.active=null,Ot.forEach(function(t){t.checked=!0}),Ot.length=ht=pt=0},handleEvent:function(t){switch(t.type){case"drop":case"dragend":this._onDrop(t);break;case"dragenter":case"dragover":Z&&(this._onDragOver(t),function(t){t.dataTransfer&&(t.dataTransfer.dropEffect="move");t.cancelable&&t.preventDefault()}(t));break;case"selectstart":t.preventDefault()}},toArray:function(){for(var t,e=[],n=this.el.children,o=0,i=n.length,r=this.options;o<i;o++)P(t=n[o],r.draggable,this.el,!1)&&e.push(t.getAttribute(r.dataIdAttr)||function(t){var e=t.tagName+t.className+t.src+t.href+t.textContent,n=e.length,o=0;for(;n--;)o+=e.charCodeAt(n);return o.toString(36)}(t));return e},sort:function(t,e){var n={},o=this.el;this.toArray().forEach(function(t,e){e=o.children[e];P(e,this.options.draggable,o,!1)&&(n[t]=e)},this),e&&this.captureAnimationState(),t.forEach(function(t){n[t]&&(o.removeChild(n[t]),o.appendChild(n[t]))}),e&&this.animateAll()},save:function(){var t=this.options.store;t&&t.set&&t.set(this)},closest:function(t,e){return P(t,e||this.options.draggable,this.el,!1)},option:function(t,e){var n=this.options;if(void 0===e)return n[t];var o=z.modifyOption(this,t,e);n[t]=void 0!==o?o:e,"group"===t&&Rt(n)},destroy:function(){U("destroy",this);var t=this.el;t[K]=null,p(t,"mousedown",this._onTapStart),p(t,"touchstart",this._onTapStart),p(t,"pointerdown",this._onTapStart),this.nativeDraggable&&(p(t,"dragover",this),p(t,"dragenter",this)),Array.prototype.forEach.call(t.querySelectorAll("[draggable]"),function(t){t.removeAttribute("draggable")}),this._onDrop(),this._disableDelayedDragEvents(),St.splice(St.indexOf(this.el),1),this.el=t=null},_hideClone:function(){ot||(U("hideClone",this),jt.eventCanceled||(R(nt,"display","none"),this.options.removeCloneOnHide&&nt.parentNode&&nt.parentNode.removeChild(nt),ot=!0))},_showClone:function(t){"clone"===t.lastPutMode?ot&&(U("showClone",this),jt.eventCanceled||(Z.parentNode!=J||this.options.group.revertClone?tt?J.insertBefore(nt,tt):J.appendChild(nt):J.insertBefore(nt,Z),this.options.group.revertClone&&this.animate(Z,nt),R(nt,"display",""),ot=!1)):this._hideClone()}},Mt&&h(document,"touchmove",function(t){(jt.active||Dt)&&t.cancelable&&t.preventDefault()}),jt.utils={on:h,off:p,css:R,find:D,is:function(t,e){return!!P(t,e,t,!1)},extend:function(t,e){if(t&&e)for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n]);return t},throttle:_,closest:P,toggleClass:k,clone:C,index:j,nextTick:Wt,cancelNextTick:zt,detectDirection:kt,getChild:B,expando:K},jt.get=function(t){return t[K]},jt.mount=function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];(e=e[0].constructor===Array?e[0]:e).forEach(function(t){if(!t.prototype||!t.prototype.constructor)throw"Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(t));t.utils&&(jt.utils=I(I({},jt.utils),t.utils)),z.mount(t)})},jt.create=function(t,e){return new jt(t,e)};var Gt,Ut,qt,Vt,Zt,$t,Qt=[],Jt=!(jt.version="1.15.6");function te(){Qt.forEach(function(t){clearInterval(t.pid)}),Qt=[]}function ee(){clearInterval($t)}var ne,oe=_(function(n,t,e,o){if(t.scroll){var i,r=(n.touches?n.touches[0]:n).clientX,a=(n.touches?n.touches[0]:n).clientY,l=t.scrollSensitivity,s=t.scrollSpeed,c=O(),u=!1;Ut!==e&&(Ut=e,te(),Gt=t.scroll,i=t.scrollFn,!0===Gt&&(Gt=M(e,!0)));var d=0,h=Gt;do{var p=h,f=X(p),g=f.top,m=f.bottom,v=f.left,b=f.right,y=f.width,w=f.height,D=void 0,E=void 0,S=p.scrollWidth,_=p.scrollHeight,C=R(p),T=p.scrollLeft,f=p.scrollTop,E=p===c?(D=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX||"visible"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY||"visible"===C.overflowY)):(D=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY)),T=D&&(Math.abs(b-r)<=l&&T+y<S)-(Math.abs(v-r)<=l&&!!T),f=E&&(Math.abs(m-a)<=l&&f+w<_)-(Math.abs(g-a)<=l&&!!f);if(!Qt[d])for(var x=0;x<=d;x++)Qt[x]||(Qt[x]={});Qt[d].vx==T&&Qt[d].vy==f&&Qt[d].el===p||(Qt[d].el=p,Qt[d].vx=T,Qt[d].vy=f,clearInterval(Qt[d].pid),0==T&&0==f||(u=!0,Qt[d].pid=setInterval(function(){o&&0===this.layer&&jt.active._onTouchMove(Zt);var t=Qt[this.layer].vy?Qt[this.layer].vy*s:0,e=Qt[this.layer].vx?Qt[this.layer].vx*s:0;"function"==typeof i&&"continue"!==i.call(jt.dragged.parentNode[K],e,t,n,Zt,Qt[this.layer].el)||H(Qt[this.layer].el,e,t)}.bind({layer:d}),24))),d++}while(t.bubbleScroll&&h!==c&&(h=M(h,!1)));Jt=u}},30),n=function(t){var e=t.originalEvent,n=t.putSortable,o=t.dragEl,i=t.activeSortable,r=t.dispatchSortableEvent,a=t.hideGhostForTarget,t=t.unhideGhostForTarget;e&&(i=n||i,a(),e=e.changedTouches&&e.changedTouches.length?e.changedTouches[0]:e,e=document.elementFromPoint(e.clientX,e.clientY),t(),i&&!i.el.contains(e)&&(r("spill"),this.onSpill({dragEl:o,putSortable:n})))};function ie(){}function re(){}ie.prototype={startIndex:null,dragStart:function(t){t=t.oldDraggableIndex;this.startIndex=t},onSpill:function(t){var e=t.dragEl,n=t.putSortable;this.sortable.captureAnimationState(),n&&n.captureAnimationState();t=B(this.sortable.el,this.startIndex,this.options);t?this.sortable.el.insertBefore(e,t):this.sortable.el.appendChild(e),this.sortable.animateAll(),n&&n.animateAll()},drop:n},a(ie,{pluginName:"revertOnSpill"}),re.prototype={onSpill:function(t){var e=t.dragEl,t=t.putSortable||this.sortable;t.captureAnimationState(),e.parentNode&&e.parentNode.removeChild(e),t.animateAll()},drop:n},a(re,{pluginName:"removeOnSpill"});var ae,le,se,ce,ue,de=[],he=[],pe=!1,fe=!1,ge=!1;function me(n,o){he.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)})}function ve(){de.forEach(function(t){t!==se&&t.parentNode&&t.parentNode.removeChild(t)})}return jt.mount(new function(){function t(){for(var t in this.defaults={scroll:!0,forceAutoScrollFallback:!1,scrollSensitivity:30,scrollSpeed:10,bubbleScroll:!0},this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this))}return t.prototype={dragStarted:function(t){t=t.originalEvent;this.sortable.nativeDraggable?h(document,"dragover",this._handleAutoScroll):this.options.supportPointer?h(document,"pointermove",this._handleFallbackAutoScroll):t.touches?h(document,"touchmove",this._handleFallbackAutoScroll):h(document,"mousemove",this._handleFallbackAutoScroll)},dragOverCompleted:function(t){t=t.originalEvent;this.options.dragOverBubble||t.rootEl||this._handleAutoScroll(t)},drop:function(){this.sortable.nativeDraggable?p(document,"dragover",this._handleAutoScroll):(p(document,"pointermove",this._handleFallbackAutoScroll),p(document,"touchmove",this._handleFallbackAutoScroll),p(document,"mousemove",this._handleFallbackAutoScroll)),ee(),te(),clearTimeout(m),m=void 0},nulling:function(){Zt=Ut=Gt=Jt=$t=qt=Vt=null,Qt.length=0},_handleFallbackAutoScroll:function(t){this._handleAutoScroll(t,!0)},_handleAutoScroll:function(e,n){var o,i=this,r=(e.touches?e.touches[0]:e).clientX,a=(e.touches?e.touches[0]:e).clientY,t=document.elementFromPoint(r,a);Zt=e,n||this.options.forceAutoScrollFallback||w||y||u?(oe(e,this.options,t,n),o=M(t,!0),!Jt||$t&&r===qt&&a===Vt||($t&&ee(),$t=setInterval(function(){var t=M(document.elementFromPoint(r,a),!0);t!==o&&(o=t,te()),oe(e,i.options,t,n)},10),qt=r,Vt=a)):this.options.bubbleScroll&&M(t,!0)!==O()?oe(e,this.options,M(t,!1),!1):te()}},a(t,{pluginName:"scroll",initializeByDefault:!0})}),jt.mount(re,ie),jt.mount(new function(){function t(){this.defaults={swapClass:"sortable-swap-highlight"}}return t.prototype={dragStart:function(t){t=t.dragEl;ne=t},dragOverValid:function(t){var e=t.completed,n=t.target,o=t.onMove,i=t.activeSortable,r=t.changed,a=t.cancel;i.options.swap&&(t=this.sortable.el,i=this.options,n&&n!==t&&(t=ne,ne=!1!==o(n)?(k(n,i.swapClass,!0),n):null,t&&t!==ne&&k(t,i.swapClass,!1)),r(),e(!0),a())},drop:function(t){var e,n,o=t.activeSortable,i=t.putSortable,r=t.dragEl,a=i||this.sortable,l=this.options;ne&&k(ne,l.swapClass,!1),ne&&(l.swap||i&&i.options.swap)&&r!==ne&&(a.captureAnimationState(),a!==o&&o.captureAnimationState(),n=ne,t=(e=r).parentNode,l=n.parentNode,t&&l&&!t.isEqualNode(n)&&!l.isEqualNode(e)&&(i=j(e),r=j(n),t.isEqualNode(l)&&i<r&&r++,t.insertBefore(n,t.children[i]),l.insertBefore(e,l.children[r])),a.animateAll(),a!==o&&o.animateAll())},nulling:function(){ne=null}},a(t,{pluginName:"swap",eventProperties:function(){return{swapItem:ne}}})}),jt.mount(new function(){function t(o){for(var t in this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this));o.options.avoidImplicitDeselect||(o.options.supportPointer?h(document,"pointerup",this._deselectMultiDrag):(h(document,"mouseup",this._deselectMultiDrag),h(document,"touchend",this._deselectMultiDrag))),h(document,"keydown",this._checkKeyDown),h(document,"keyup",this._checkKeyUp),this.defaults={selectedClass:"sortable-selected",multiDragKey:null,avoidImplicitDeselect:!1,setData:function(t,e){var n="";de.length&&le===o?de.forEach(function(t,e){n+=(e?", ":"")+t.textContent}):n=e.textContent,t.setData("Text",n)}}}return t.prototype={multiDragKeyDown:!1,isMultiDrag:!1,delayStartGlobal:function(t){t=t.dragEl;se=t},delayEnded:function(){this.isMultiDrag=~de.indexOf(se)},setupClone:function(t){var e=t.sortable,t=t.cancel;if(this.isMultiDrag){for(var n=0;n<de.length;n++)he.push(C(de[n])),he[n].sortableIndex=de[n].sortableIndex,he[n].draggable=!1,he[n].style["will-change"]="",k(he[n],this.options.selectedClass,!1),de[n]===se&&k(he[n],this.options.chosenClass,!1);e._hideClone(),t()}},clone:function(t){var e=t.sortable,n=t.rootEl,o=t.dispatchSortableEvent,t=t.cancel;this.isMultiDrag&&(this.options.removeCloneOnHide||de.length&&le===e&&(me(!0,n),o("clone"),t()))},showClone:function(t){var e=t.cloneNowShown,n=t.rootEl,t=t.cancel;this.isMultiDrag&&(me(!1,n),he.forEach(function(t){R(t,"display","")}),e(),ue=!1,t())},hideClone:function(t){var e=this,n=(t.sortable,t.cloneNowHidden),t=t.cancel;this.isMultiDrag&&(he.forEach(function(t){R(t,"display","none"),e.options.removeCloneOnHide&&t.parentNode&&t.parentNode.removeChild(t)}),n(),ue=!0,t())},dragStartGlobal:function(t){t.sortable;!this.isMultiDrag&&le&&le.multiDrag._deselectMultiDrag(),de.forEach(function(t){t.sortableIndex=j(t)}),de=de.sort(function(t,e){return t.sortableIndex-e.sortableIndex}),ge=!0},dragStarted:function(t){var e,n=this,t=t.sortable;this.isMultiDrag&&(this.options.sort&&(t.captureAnimationState(),this.options.animation&&(de.forEach(function(t){t!==se&&R(t,"position","absolute")}),e=X(se,!1,!0,!0),de.forEach(function(t){t!==se&&T(t,e)}),pe=fe=!0)),t.animateAll(function(){pe=fe=!1,n.options.animation&&de.forEach(function(t){x(t)}),n.options.sort&&ve()}))},dragOver:function(t){var e=t.target,n=t.completed,t=t.cancel;fe&&~de.indexOf(e)&&(n(!1),t())},revert:function(t){var n,o,e=t.fromSortable,i=t.rootEl,r=t.sortable,a=t.dragRect;1<de.length&&(de.forEach(function(t){r.addAnimationState({target:t,rect:fe?X(t):a}),x(t),t.fromRect=a,e.removeAnimationState(t)}),fe=!1,n=!this.options.removeCloneOnHide,o=i,de.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)}))},dragOverCompleted:function(t){var e,n=t.sortable,o=t.isOwner,i=t.insertion,r=t.activeSortable,a=t.parentEl,l=t.putSortable,t=this.options;i&&(o&&r._hideClone(),pe=!1,t.animation&&1<de.length&&(fe||!o&&!r.options.sort&&!l)&&(e=X(se,!1,!0,!0),de.forEach(function(t){t!==se&&(T(t,e),a.appendChild(t))}),fe=!0),o||(fe||ve(),1<de.length?(o=ue,r._showClone(n),r.options.animation&&!ue&&o&&he.forEach(function(t){r.addAnimationState({target:t,rect:ce}),t.fromRect=ce,t.thisAnimationDuration=null})):r._showClone(n)))},dragOverAnimationCapture:function(t){var e=t.dragRect,n=t.isOwner,t=t.activeSortable;de.forEach(function(t){t.thisAnimationDuration=null}),t.options.animation&&!n&&t.multiDrag.isMultiDrag&&(ce=a({},e),e=b(se,!0),ce.top-=e.f,ce.left-=e.e)},dragOverAnimationComplete:function(){fe&&(fe=!1,ve())},drop:function(t){var o,i,r,a,n,e,l,s=t.originalEvent,c=t.rootEl,u=t.parentEl,d=t.sortable,h=t.dispatchSortableEvent,p=t.oldIndex,t=t.putSortable,f=t||this.sortable;s&&(o=this.options,i=u.children,ge||(o.multiDragKey&&!this.multiDragKeyDown&&this._deselectMultiDrag(),k(se,o.selectedClass,!~de.indexOf(se)),~de.indexOf(se)?(de.splice(de.indexOf(se),1),ae=null,G({sortable:d,rootEl:c,name:"deselect",targetEl:se,originalEvent:s})):(de.push(se),G({sortable:d,rootEl:c,name:"select",targetEl:se,originalEvent:s}),s.shiftKey&&ae&&d.el.contains(ae)?(r=j(ae),a=j(se),~r&&~a&&r!==a&&function(){for(var e,t=r<a?(e=r,a):(e=a,r+1),n=o.filter;e<t;e++)~de.indexOf(i[e])||P(i[e],o.draggable,u,!1)&&(n&&("function"==typeof n?n.call(d,s,i[e],d):n.split(",").some(function(t){return P(i[e],t.trim(),u,!1)}))||(k(i[e],o.selectedClass,!0),de.push(i[e]),G({sortable:d,rootEl:c,name:"select",targetEl:i[e],originalEvent:s})))}()):ae=se,le=f)),ge&&this.isMultiDrag&&(fe=!1,(u[K].options.sort||u!==c)&&1<de.length&&(n=X(se),e=j(se,":not(."+this.options.selectedClass+")"),!pe&&o.animation&&(se.thisAnimationDuration=null),f.captureAnimationState(),pe||(o.animation&&(se.fromRect=n,de.forEach(function(t){var e;t.thisAnimationDuration=null,t!==se&&(e=fe?X(t):n,t.fromRect=e,f.addAnimationState({target:t,rect:e}))})),ve(),de.forEach(function(t){i[e]?u.insertBefore(t,i[e]):u.appendChild(t),e++}),p===j(se)&&(l=!1,de.forEach(function(t){t.sortableIndex!==j(t)&&(l=!0)}),l&&(h("update"),h("sort")))),de.forEach(function(t){x(t)}),f.animateAll()),le=f),(c===u||t&&"clone"!==t.lastPutMode)&&he.forEach(function(t){t.parentNode&&t.parentNode.removeChild(t)}))},nullingGlobal:function(){this.isMultiDrag=ge=!1,he.length=0},destroyGlobal:function(){this._deselectMultiDrag(),p(document,"pointerup",this._deselectMultiDrag),p(document,"mouseup",this._deselectMultiDrag),p(document,"touchend",this._deselectMultiDrag),p(document,"keydown",this._checkKeyDown),p(document,"keyup",this._checkKeyUp)},_deselectMultiDrag:function(t){if(!(void 0!==ge&&ge||le!==this.sortable||t&&P(t.target,this.options.draggable,this.sortable.el,!1)||t&&0!==t.button))for(;de.length;){var e=de[0];k(e,this.options.selectedClass,!1),de.shift(),G({sortable:this.sortable,rootEl:this.sortable.el,name:"deselect",targetEl:e,originalEvent:t})}},_checkKeyDown:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!0)},_checkKeyUp:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!1)}},a(t,{pluginName:"multiDrag",utils:{select:function(t){var e=t.parentNode[K];e&&e.options.multiDrag&&!~de.indexOf(t)&&(le&&le!==e&&(le.multiDrag._deselectMultiDrag(),le=e),k(t,e.options.selectedClass,!0),de.push(t))},deselect:function(t){var e=t.parentNode[K],n=de.indexOf(t);e&&e.options.multiDrag&&~n&&(k(t,e.options.selectedClass,!1),de.splice(n,1))}},eventProperties:function(){var n=this,o=[],i=[];return de.forEach(function(t){var e;o.push({multiDragElement:t,index:t.sortableIndex}),e=fe&&t!==se?-1:fe?j(t,":not(."+n.options.selectedClass+")"):j(t),i.push({multiDragElement:t,index:e})}),{items:r(de),clones:[].concat(he),oldIndicies:o,newIndicies:i}},optionListeners:{multiDragKey:function(t){return"ctrl"===(t=t.toLowerCase())?t="Control":1<t.length&&(t=t.charAt(0).toUpperCase()+t.substr(1)),t}}})}),jt});


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    //https://github.com/samlinz/infilist/blob/master/build/scroll.min.js    
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    /* InfiScroll */"use strict";
(function() {
    var NAME = "InfiScroll";
    var OPT = Object.freeze({
        TRESHOLD: "treshold",
        ELEMENT_LIMIT: "elementLimit",
        SIZE: "size",
        QUERY: "generator",
        FIXED_SIZE: "fixedSize",
        CHILD_SIZE: "childSize",
        CACHE_SIZE: "cacheSize",
        INVALIDATE_CHECK: "check",
        DOM_DELETE: "domDelete",
        TOGGLE_SPINNER: "spinner",
        THROTTLE_SCROLL: "throttleScroll",
        KEEP_POSITION_ON_RELOAD: "keepPositionOnReload",
        BATCH_LOAD: "batchLoad"
    });
    var OPT_VALUES = Object.keys(OPT).map(function(key) {
        return OPT[key]
    });
    if ("undefined" == typeof window)
        throw new Error(NAME + " cannot be used in non-browser environment");
    if (NAME in window)
        throw new Error("CLASH: Global property " + NAME + " exist already in window!");
    function warn(msg) {
        console.warn(NAME + ": " + msg)
    }
    function raf(fn) {
        return (window.requestAnimationFrame || function(cb) {
            return window.setTimeout(cb, 16)
        })(fn)
    }
    function caf(id) {
        (window.cancelAnimationFrame || window.clearTimeout)(id)
    }
    function isAttached(el) {
        return !!(el && (el.offsetParent || el === document.body || el === document.documentElement))
    }
    function safeParsePx(value) {
        var n = Number.parseInt ? Number.parseInt(value, 10) : parseInt(value, 10);
        return isFinite(n) && !isNaN(n) ? n : 0
    }
    function indexId(instance, index) {
        return "__" + NAME + "_" + instance.__uniqueIdentifier + "_index_" + index
    }
    function visibleIndexes(scrollTop, clientHeight, threshold, childSize) {
        if (!childSize || childSize <= 0)
            return [0];
        var first = Math.max(Math.floor(Math.max(scrollTop - threshold, 0) / childSize), 0);
        var startPx = first * childSize;
        var count = Math.ceil((clientHeight + 2 * threshold + Math.max(scrollTop - startPx, 0)) / childSize) || 1;
        var out = new Array(count);
        for (var i = 0; i < count; i++)
            out[i] = first + i;
        return out
    }
    function requireOptions(options) {
        var missing = [];
        for (var i = 1; i < arguments.length; i++)
            arguments[i] in options || missing.push(arguments[i]);
        if (missing.length)
            throw Error("Options object is missing required properties " + missing.join(","))
    }
    function callDomDelete(instance, el) {
        if (!el || "function" != typeof instance.__domDelete)
            return;
        try {
            instance.__domDelete(el)
        } catch (e) {
            warn("domDelete callback failed: " + e)
        }
    }
    function setDummyTop(instance, top) {
        top = isFinite(top) && !isNaN(top) ? Math.max(0, top) : 0;
        instance.__dummyElement.style.top = top + "px";
        instance.__currentScrollHeight = top;
        isAttached(instance.__dummyElement) || instance.element.appendChild(instance.__dummyElement)
    }
    function applyFixedSize(instance) {
        if (instance.__fixedSize) {
            var top = (instance.__childSize || 0) * ("number" == typeof instance.__size ? instance.__size : 0);
            setDummyTop(instance, top)
        }
    }
    function growDummyForIndex(instance, index) {
        if (instance.__fixedSize || !instance.__childSize || "number" != typeof instance.__size)
            return;
        if (index === instance.__size - 1)
            return;
        var target = Math.min(instance.__size * instance.__childSize, index * instance.__childSize + 5 * instance.__childSize);
        if (target > instance.__currentScrollHeight)
            setDummyTop(instance, target)
    }
    function touchManagedQueue(instance, index) {
        if (!instance.__queue)
            instance.__queue = new Set;
        instance.__queue.has(index) && instance.__queue.delete(index);
        instance.__queue.add(index)
    }
    function deleteManagedQueue(instance, index) {
        instance.__queue && instance.__queue.delete(index)
    }
    function trimManagedQueue(instance) {
        var toRemove = [];
        if (!instance.__elementLimit || !instance.__queue)
            return toRemove;
        for (var guard = 0, max = instance.__queue.size; instance.__queue.size > instance.__elementLimit && guard++ < max; ) {
            var next = instance.__queue.values().next();
            if (next.done)
                break;
            var idx = next.value;
            instance.__queue.delete(idx);
            instance.__inView.has(idx) || instance.__queries.has(idx) ? instance.__queue.add(idx) : toRemove.push(idx)
        }
        return toRemove
    }
    function cacheManagedElement(instance, index, el) {
        if (!el)
            return;
        instance.__cache.has(index) && instance.__cache.delete(index);
        instance.__cache.set(index, el)
    }
    function removeManagedElement(instance, index, toCache) {
        var el = instance.__elementMap.get(index);
        if (!el) {
            var id = indexId(instance, index);
            el = document.getElementById(id)
        }
        if (el && el.parentNode === instance.element) {
            instance.element.removeChild(el);
            toCache ? cacheManagedElement(instance, index, el) : callDomDelete(instance, el)
        }
        instance.__elementMap.delete(index);
        instance.__domElements.delete(index);
        return el
    }
    function mountElement(instance, index, el, replace) {
        if (instance.__disposed || instance.__generation !== instance.__activeGeneration)
            return;
        if (!(el instanceof HTMLElement))
            throw Error(NAME + " query callback resolved with non-HTMLElement result.");
        var top = index * (instance.__childSize || 0);
        el.style.position = "absolute";
        el.style.margin = 0;
        el.style.top = top + "px";
        el.style.left = 0;
        el.style.right = 0;
        el.id = indexId(instance, index);
        if (instance.__childSize)
            el.style.height = instance.__childSize + "px";
        var old = instance.__elementMap.get(index);
        if (!old) {
            var oldById = document.getElementById(el.id);
            oldById && oldById.parentNode === instance.element && (old = oldById)
        }
        if (replace && old && old.parentNode === instance.element) {
            instance.element.insertBefore(el, old);
            instance.element.removeChild(old);
            old !== el && callDomDelete(instance, old)
        } else if (old && old.parentNode === instance.element) {
            instance.element.replaceChild(el, old);
            old !== el && callDomDelete(instance, old)
        } else {
            instance.element.appendChild(el)
        }
        instance.__elementMap.set(index, el);
        instance.__domElements.add(index);
        if (!instance.__childSize) {
            instance.__childSize = Math.max(el.scrollHeight || el.offsetHeight || 0, 1);
            instance.__treshold = instance.__tresholdFactor * instance.__childSize;
            instance.__elementMap.forEach(function(child) {
                child.style.height = instance.__childSize + "px"
            });
            instance.__fixedSize && applyFixedSize(instance);
            instance.scheduleInvalidate(0)
        }
        if (index === instance.__size - 1) {
            instance.__finalElement && instance.__finalElement !== el && instance.__finalElement.classList.remove("last-of-list");
            el.classList.add("last-of-list");
            instance.__finalElement = el
        }
        growDummyForIndex(instance, index)
    }
    function finishReloadIfIdle(instance) {
        if (0 === instance.__queries.size && instance.__reloading) {
            instance.__reloading = false;
            if (instance.__reloadingChildrenToRemove) {
                instance.__reloadingChildrenToRemove.forEach(function(child) {
                    try {
                        child.parentNode === instance.element && instance.element.removeChild(child);
                        callDomDelete(instance, child)
                    } catch (e) {
                        warn("Child " + child.id + " to be removed after reload was not a child of root element (anymore)")
                    }
                });
                instance.__reloadingChildrenToRemove = null
            }
            if (instance.__reloadAfterInvalidation) {
                instance.__reloadAfterInvalidation = false;
                instance.scheduleCallback(function() {
                    instance.reload()
                }, 10)
            }
        }
    }
    function resolveQuery(instance, requestIndex, result, generation) {
        if (instance.__disposed || generation !== instance.__generation || generation !== instance.__activeGeneration)
            return;
        if (null == result || result.constructor === Array && 0 === result.length) {
            if (requestIndex.constructor === Array)
                requestIndex.forEach(function(idx) {
                    instance.__queries.delete(idx)
                });
            else
                instance.__queries.delete(requestIndex);
            return
        }
        if (requestIndex.constructor === Array) {
            for (var i = 0; i < requestIndex.length; i++) {
                (function(idx, element) {
                    instance.scheduleCallback(function() {
                        resolveQuery(instance, idx, element, generation)
                    })
                })(requestIndex[i], result[i])
            }
            return
        }
        instance.__queries.delete(requestIndex);
        instance.__cache.delete(requestIndex);
        mountElement(instance, requestIndex, result, false);
        finishReloadIfIdle(instance)
    }
    function InfiScroll(element, options) {
        var self = this;
        if (!(element instanceof HTMLElement))
            throw Error(element + " is not instance of HTMLElement");
        if (!options)
            throw Error("options argument must be passed to " + NAME + " constructor");
        var computed = window.getComputedStyle(element);
        if (!~["absolute", "relative"].indexOf(computed.position))
            throw Error(element + " must have position of 'absolute' or 'relative'");
        requireOptions(options, OPT.QUERY);
        this.element = element;
        this.__disposed = false;
        this.__generation = 1;
        this.__activeGeneration = this.__generation;
        this.__pendingTimers = new Set;
        this.__rafId = null;
        this.__scrollThrottleTimer = null;
        this.__spinnerTimeout = null;
        this.__domElements = new Set;
        this.__inView = new Set;
        this.__queue = new Set;
        this.__cacheQueue = new Set;
        this.__cache = new Map;
        this.__elementMap = new Map;
        this.__queries = new Set;
        this.__updateRequests = new Map;
        this.__query = options[OPT.QUERY];
        this.__check = options[OPT.INVALIDATE_CHECK];
        this.__childSize = options[OPT.CHILD_SIZE];
        this.__fixedSize = options[OPT.FIXED_SIZE];
        this.__size = options[OPT.SIZE];
        this.__elementLimit = options[OPT.ELEMENT_LIMIT];
        this.__cacheSize = options[OPT.CACHE_SIZE];
        this.__domDelete = options[OPT.DOM_DELETE];
        this.__spinner = options[OPT.TOGGLE_SPINNER];
        this.__keepPositionOnReload = options[OPT.KEEP_POSITION_ON_RELOAD];
        this.__batchLoad = options[OPT.BATCH_LOAD];
        this.__throttleScroll = !(OPT.THROTTLE_SCROLL in options) || options[OPT.THROTTLE_SCROLL];
        this.__tresholdFactor = OPT.TRESHOLD in options ? options[OPT.TRESHOLD] : .5;
        this.__treshold = this.__childSize ? this.__tresholdFactor * this.__childSize : 0;
        this.__currentScrollHeight = 0;
        this.__lastScrollTop = 0;
        this.__uniqueIdentifier = 1e6 * Math.random() >>> 0;
        if (this.__spinner && "function" != typeof this.__spinner)
            throw Error("Given spinner callback is not function. Provide a function which takes a single boolean parameter.");
        this.__spinner && this.__spinner(!0);
        var invalid = Object.keys(options).filter(function(k) {
            return !~OPT_VALUES.indexOf(k)
        });
        invalid.length && warn("Options object contained invalid options '" + invalid + "'. Typos?");
        this.__resizeListener = function() {
            self.scheduleInvalidate(0)
        };
        window.addEventListener("resize", this.__resizeListener);
        this.__scrollListener = function() {
            if (self.__throttleScroll)
                self.scheduleInvalidate(0);
            else
                self.invalidate()
        };
        element.addEventListener("scroll", this.__scrollListener);
        while (this.element.firstChild)
            this.element.removeChild(this.element.firstChild);
        var dummy = document.createElement("div");
        dummy.style.height = dummy.style.width = "1px";
        dummy.style.visibility = "hidden";
        dummy.style.position = "absolute";
        this.__dummyElement = dummy;
        applyFixedSize(this);
        this.scheduleInvalidate(0)
    }
    InfiScroll.prototype.scheduleCallback = function(fn, delay) {
        var self = this;
        delay = delay || 0;
        var timer = window.setTimeout(function() {
            self.__pendingTimers.delete(timer);
            !self.__disposed && fn()
        }, delay);
        this.__pendingTimers.add(timer);
        return timer
    };
    InfiScroll.prototype.scheduleInvalidate = function(delay) {
        var self = this;
        if (this.__disposed)
            return;
        delay = delay || 0;
        if (delay > 0)
            return this.scheduleCallback(function() {
                self.invalidate()
            }, delay);
        if (null != this.__rafId)
            return;
        this.__rafId = raf(function() {
            self.__rafId = null;
            self.invalidate()
        })
    };
    InfiScroll.prototype.showSpinnerPulse = function() {
        if (!this.__spinner)
            return;
        this.__spinner(!0);
        clearTimeout(this.__spinnerTimeout);
        var spinner = this.__spinner;
        this.__spinnerTimeout = this.scheduleCallback(function() {
            spinner(!1)
        }, 100)
    };
    InfiScroll.prototype.trimCache = function() {
        while (this.__cacheSize && this.__cache.size > this.__cacheSize) {
            var next = this.__cache.keys().next();
            if (next.done)
                break;
            var idx = next.value;
            var el = this.__cache.get(idx);
            this.__cache.delete(idx);
            callDomDelete(this, el)
        }
    };
    InfiScroll.prototype.reload = function() {
        var self = this;
        if (this.__disposed)
            return;
        if (this.__reloading) {
            this.__reloadAfterInvalidation = true;
            return
        }
        this.__reloading = true;
        this.__generation++;
        this.__activeGeneration = this.__generation;
        var old = [];
        Array.prototype.forEach.call(this.element.childNodes, function(child) {
            child.id && -1 !== child.id.indexOf(NAME) && old.push(child)
        });
        this.__reloadingChildrenToRemove = old;
        this.__domElements.clear();
        this.__inView.clear();
        this.__cache.clear();
        this.__elementMap.clear();
        this.__queries.clear();
        this.__updateRequests.clear();
        this.__queue = new Set;
        this.__cacheQueue = new Set;
        if (!this.__keepPositionOnReload) {
            this.__dummyElement.style.top = "0px";
            this.__currentScrollHeight = 0
        }
        this.__uniqueIdentifier = 1e6 * Math.random() >>> 0;
        this.scheduleInvalidate(0)
    };
    InfiScroll.prototype.invalidate = function(force) {
        if (this.__disposed)
            return;
        if (!force) {
            if (this.__check) {
                if (!this.__check())
                    return
            } else if (!isAttached(this.element))
                return
        }
        var scrollTop = this.element.scrollTop;
        var clientHeight = this.element.clientHeight;
        if (0 === scrollTop && !isAttached(this.element) && null != this.__lastScrollTop)
            scrollTop = this.__lastScrollTop;
        this.__lastScrollTop = scrollTop;
        var wanted = visibleIndexes(scrollTop, clientHeight, this.__treshold || 0, this.__childSize || 0);
        var wantedSet = new Set;
        var missing = [];
        for (var wi = 0; wi < wanted.length; wi++) {
            var index = wanted[wi];
            if ("number" == typeof this.__size && index >= this.__size)
                continue;
            wantedSet.add(index);
            this.__domElements.has(index) || missing.push(index)
        }
        this.__inView = wantedSet;
        if (this.__elementLimit) {
            var toRemove = trimManagedQueue(this);
            if (toRemove.length) {
                var self = this;
                this.scheduleCallback(function() {
                    toRemove.forEach(function(idx) {
                        removeManagedElement(self, idx, true)
                    });
                    self.trimCache()
                })
            }
        }
        var toQuery = [];
        var lastIndex = null;
        var generation = this.__generation;
        for (var mi = 0; mi < missing.length; mi++) {
            var idx = missing[mi];
            if ("number" == typeof this.__size && idx >= this.__size)
                continue;
            this.showSpinnerPulse();
            if (!this.__queries.has(idx)) {
                touchManagedQueue(this, idx);
                if (this.__cache.has(idx)) {
                    var cached = this.__cache.get(idx);
                    this.__cache.delete(idx);
                    mountElement(this, idx, cached, false)
                } else {
                    this.__queries.add(idx);
                    toQuery.push(idx)
                }
            }
            lastIndex = idx
        }
        null !== lastIndex && growDummyForIndex(this, lastIndex);
        if (!toQuery.length)
            return void finishReloadIfIdle(this);
        var self = this;
        var resolver = function(requestIndex, result) {
            resolveQuery(self, requestIndex, result, generation)
        };
        var query = this.__query.bind(this);
        if (this.__batchLoad)
            query(toQuery, function(result) {
                resolver(toQuery, result)
            });
        else
            toQuery.forEach(function(idx) {
                query(idx, function(result) {
                    resolver(idx, result)
                })
            })
    };
    InfiScroll.prototype.updateItem = function(index) {
        var self = this;
        if (this.__disposed || !this.__domElements.has(index))
            return;
        var token = 1e6 * Math.random() >>> 0;
        var generation = this.__generation;
        this.__updateRequests.set(index, token);
        var args = Array.prototype.slice.call(arguments, 1);
        this.__query.apply(this, [index, function(result) {
            if (self.__disposed || generation !== self.__generation || self.__updateRequests.get(index) !== token)
                return;
            result && result.constructor === Array && (result = result[0]);
            result && mountElement(self, index, result, true)
        }].concat(args))
    };
    InfiScroll.prototype.updateSize = function(size) {
        if ("number" != typeof size || size < 0)
            throw Error("Invalid size " + size);
        if (this.__disposed)
            return;
        var oldSize = this.__size;
        var newSize = +size;
        if (newSize === oldSize)
            return;
        this.__size = newSize;
        applyFixedSize(this);
        var totalHeight = newSize * (this.__childSize || 0);
        var currentDummyTop = safeParsePx(this.__dummyElement.style.top);
        var viewportBottom = this.element.scrollTop + this.element.clientHeight;
        if (totalHeight < currentDummyTop)
            setDummyTop(this, totalHeight);
        if (totalHeight < viewportBottom)
            this.element.scrollTop = Math.max(totalHeight - this.element.clientHeight, 0);
        var removeIndexes = [];
        this.__domElements.forEach(function(idx) {
            newSize <= idx && removeIndexes.push(idx)
        });
        for (var i = 0; i < removeIndexes.length; i++) {
            var idx = removeIndexes[i];
            removeManagedElement(this, idx, false);
            this.__cache.delete(idx);
            deleteManagedQueue(this, idx);
            this.__cacheQueue && this.__cacheQueue.delete && this.__cacheQueue.delete(idx)
        }
        if (0 === newSize) {
            var children = Array.from(this.element.children);
            for (var j = 0; j < children.length; j++) {
                var child = children[j];
                child.id && child.id.includes(NAME) && (warn("Found an child element '" + child.id + "' when the size was set to 0!"), this.element.removeChild(child), callDomDelete(this, child))
            }
            this.__domElements.clear();
            this.__elementMap.clear()
        }
        0 === oldSize && this.invalidate(true)
    };
    InfiScroll.prototype.dispose = function() {
        if (this.__disposed)
            return;
        this.__disposed = true;
        this.__generation++;
        null != this.__rafId && (caf(this.__rafId), this.__rafId = null);
        clearTimeout(this.__scrollThrottleTimer);
        clearTimeout(this.__spinnerTimeout);
        this.__pendingTimers.forEach(function(timer) {
            clearTimeout(timer)
        });
        this.__pendingTimers.clear();
        window.removeEventListener("resize", this.__resizeListener);
        this.element && this.element.removeEventListener("scroll", this.__scrollListener);
        var self = this;
        this.__elementMap.forEach(function(el, idx) {
            el.parentNode === self.element && self.element.removeChild(el);
            callDomDelete(self, el)
        });
        this.__cache.forEach(function(el) {
            callDomDelete(self, el)
        });
        this.__elementMap.clear();
        this.__cache.clear();
        this.__cacheQueue && this.__cacheQueue.clear && this.__cacheQueue.clear();
        this.__queue && this.__queue.clear && this.__queue.clear();
        this.__domElements.clear();
        this.__inView.clear();
        this.__queries.clear();
        this.__updateRequests.clear()
    };
    window[NAME] = InfiScroll
})();

CgLibs.modules.TWRoleCgEditor = {
    boot: function(e) {
        System.register("TWRoleCgEditor/app", ["./appInit", "./libs/Utils", "./roleeditor/RoleEditorApp", "./roleeditor/InGameRoleEditorApp"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    o = e
                }
                , function(e) {
                    s = e
                }
                , function(e) {
                    n = e
                }
                , function(e) {
                    r = e
                }
                ],
                execute: function() {
                    a = e.Base.utils.NetUtil,
                    o.app_inited,
                    l = a.getQueryStringValue("usage"),
                    c = s.Utils.parseUsage(l, a.getQueryStringValue("params")),
                    "ingameEditor" == l ? new r.InGameRoleEditorApp(c).start() : new n.RoleEditorApp("role",c)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/appInit", ["./translations/index"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g, f;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    s = e
                }
                ],
                execute: function() {
                    a = e.Base.pixi,
                    o = e.Base.pixis.Pixi,
                    n = e.TwilightWarsLib.games.items.StuffType,
                    r = e.TwilightWarsLib.games.configs.magazineConfig,
                    l = e.TwilightWarsLib.games.configs.closeWeaponConfig,
                    c = e.TwilightWarsLib.games.configs.farWeaponConfig,
                    p = e.TwilightWarsLib.games.configs.throwableWeaponConfig,
                    d = e.TwilightWarsLib.games.configs.itemConfig,
                    h = e.TwilightWarsLib.games.configs.storeItemConfig,
                    m = e.TwilightWarsLib.games.configs.armorConfig,
                    u = e.TwilightWarsLib.games.configs.abilityBookConfig,
                    g = e.TwilightWarsLib.games.items.weapons.customs.BladeType,
                    f = e.TwilightWarsLib.games.configs.bladeConfig,
                    s.tw_trans_all,
                    a.initialize(600, 500, {
                        transparent: !0,
                        antialias: !0
                    }),
                    a.stageAlignHorizontal = o.ALIGN_HORIZONTAL.LEFT,
                    a.stageAlignVertical = o.ALIGN_VERTICAL.TOP,
                    a.stageResolutionPolicy = o.RESOLUTION_POLICY.ORIGIN,
                    $(a.renderer.view).css("z-index", 100),
                    $(a.renderer.view).css("position", "relative"),
                    $(a.renderer.view).css("pointer-events", "none"),
                    n.parseJson(r),
                    n.parseJson(l),
                    n.parseJson(c),
                    n.parseJson(p),
                    n.parseJson(d),
                    n.parseJson(h),
                    n.parseJson(u),
                    n.parseJson(m),
                    g.parseJson(f),
                    e.Base.system.hideFps(),
                    t("app_inited", 1)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/libs/Utils", [], (function(t, i) {
            "use strict";
            var a, o;
            i && i.id,
            i && i.id;
            return {
                setters: [],
                execute: function() {
                    a = e.Base.geom.Color,
                    (o = new PIXI.filters.ColorMatrixFilter).matrix = new a(0,.5).grayoutMatrix(0, 1, !0),
                    t("Utils", class {
                        static getGrayoutFilter() {
                            return o
                        }
                        static numberAddSpace(e, t) {
                            let i = e.toString();
                            for (; i.length < t; )
                                i = " " + i;
                            return i
                        }
                        static parseUsage(e, t) {
                            let i = {};
                            if (t)
                                try {
                                    i = JSON.parse(atob(t)) || {}
                                } catch (e) {
                                    console.warn("TWRoleCgEditor: invalid usage params", e)
                                }
                            return {
                                usage: e,
                                params: i,
                                initJson: null
                            }
                        }
                    }
                    )
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/roleeditor/RoleEditorApp", ["./../BaseHelperApp", "./RoleEditor"], (function(t, i) {
            "use strict";
            var a, o, s;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    o = e
                }
                ],
                execute: function() {
                    s = class t extends a.BaseHelperApp {
                        static requireResources() {
                            e.Base.resourceManager.addAppResource("TwilightWarsLib.actors"),
                            e.Base.resourceManager.addAppResource("TwilightWarsLib.role_decorations"),
                            e.Base.resourceManager.addAppResource("TwilightWarsLib.sounds1")
                        }
                        constructor(e, i) {
                            super(e, i),
                            t.requireResources()
                        }
                        onEditorInited() {
                            o.showRoleEditorScreen({
                                emitter: this,
                                appUsage: this.appUsage
                            })
                        }
                        postMessage(e, t) {
                            if ("requestData" == e) {
                                let e = {};
                                this.delayResponse("initEditor", e)
                            }
                        }
                    }
                    ,
                    t("RoleEditorApp", s)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/roleeditor/InGameRoleEditorApp", ["./RoleEditor", "./RoleEditorApp"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    s = e
                }
                , function(e) {
                    l = e
                }
                ],
                execute: function() {
                    a = e.TwilightWarsLib.myProfile,
                    o = e.TwilightWarsLib.games.datas.Camp,
                    n = e.TwilightWarsLib.games.datas.RoleDesignData,
                    r = e.TwilightWarsLib.games.datas.RoleSet,
                    c = e.Base.translation.translate,
                    p = e.TwilightWarsLib.libs.UserRoleManager,
                    d = class extends PIXI.utils.EventEmitter {
                        constructor(t) {
                            super(),
                            this.appUsage = t,
                            e.Base.showCGPreloader(),
                            l.RoleEditorApp.requireResources(),
                            this.camp = o.getByCode(t.params.camp),
                            this.slotIndex = Number(t.params.slot)
                        }
                        debug(t) {
                            e.GLT.auth.onReady((i => {
                                let o = a;
                                i && !i.guest ? (o.setUser(i),
                                o.roleManager.listAvailableSlotItems(this.camp).then((e => {
                                    let i = e.find((e => e.slot == this.slotIndex));
                                    return this.item = i && i.item,
                                    t ? Promise.resolve() : o.roleManager.loadCustomRoles(this.camp).then(( () => {
                                        t = o.roleManager.getCustomRole(this.camp, this.slotIndex)
                                    }
                                    ))
                                }
                                )).then(( () => e.Base.resourceManager.load())).then(( () => this.onReady(t)))) : (e.Base.hideCGPreloader(),
                                e.Server.components.showAuthPanel(),
                                e.GLT.auth.onAuth((i => {
                                    o.setUser(i),
                                    e.Base.showCGPreloader(),
                                    e.Base.resourceManager.load().then(( () => this.onReady(t)))
                                }
                                )))
                            }
                            ))
                        }
                        start() {
                            e.GLT.auth.onReady(( () => {
                                e.GLT.loginFromParent().then((t => {
                                    if (t) {
                                        a.setUser(t, !1);
                                        let i = a.roleManager;
                                        Promise.all([i.listAvailableSlotItems(this.camp).then((e => {
                                            let t = e.find((e => e.slot == this.slotIndex));
                                            this.item = t && t.item,
                                            this.onEditItem(this.item)
                                        }
                                        )), i.loadCustomRoles(this.camp), e.Base.resourceManager.load()]).then(( () => {
                                            let e = i.getCustomRole(this.camp, this.slotIndex);
                                            this.onReady(e)
                                        }
                                        ))
                                    }
                                }
                                ))
                            }
                            ))
                        }
                        onReady(t) {
                            e.Base.hideCGPreloader(),
                            s.showRoleEditorScreen({
                                emitter: this,
                                appUsage: this.appUsage,
                                ingame: {
                                    role: t || n.createFromRoleSet(r.getPlayerDefault(this.camp, !1)),
                                    slot: this.slotIndex,
                                    item: this.item
                                }
                            }),
                            this.on("saveRole", this.onSaveRole, this),
                            this.on("editItem", this.onEditItem, this)
                        }
                        onEditItem(e) {
                            let t = window.opener || window.parent;
                            t && t.postMessage({
                                type: p.MESSAGE_TYPE.EDITOR_ITEM,
                                item: e ? e.valueObject : null
                            }, "*")
                        }
                        onSaveRole(t) {
                            let i = window.opener || window.parent;
                            i && (e.Base.showCGPreloader(),
                            a.roleManager.saveCustomRole(this.slotIndex, t).then(( () => {
                                i.postMessage({
                                    type: p.MESSAGE_TYPE.EDITOR_SAVE,
                                    role: t.exportSyncJson()
                                }, "*")
                            }
                            )).catch((t => {
                                e.GLT.components.showAlert(c("glt.error"), t, c("glt.close"))
                            }
                            )).then(( () => {
                                e.Base.hideCGPreloader()
                            }
                            )))
                        }
                    }
                    ,
                    t("InGameRoleEditorApp", d)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/translations/index", ["./trans.en", "./trans.zh", "./trans.cn"], (function(t, i) {
            "use strict";
            var a, o, s, n, r;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    o = e
                }
                , function(e) {
                    s = e
                }
                , function(e) {
                    n = e
                }
                ],
                execute: function() {
                    a = e.Base.locales.LANG,
                    s.tw_trans_zh,
                    o.tw_trans_en,
                    n.tw_trans_cn,
                    r = e.Base.locales.getByCode(e.Base.utils.NetUtil.getQueryStringValue("locale")),
                    r = [a.ZH_CN, a.ZH_HANS].includes(r) ? a.ZH_CN : r ? e.Base.locales.listSimilarLanguages(r).includes(a.ZH) ? a.ZH : a.EN : e.Base.locales.getPreferedLanguage([a.ZH, a.ZH_CN, a.EN]),
                    e.Base.translation.setLanguage(r),
                    t("tw_trans_all", 1)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/ResourceGate", [], (function(t, i) {
            "use strict";
            var a;
            i && i.id,
            i && i.id;
            return {
                setters: [],
                execute: function() {
                    a = class {
                        static _normalizeAliases(e) {
                            return (Array.isArray(e) ? e : e ? [e] : []).filter((e => !!e)).map((e => String(e)))
                        }
                        static _normalizeSources(e) {
                            return (Array.isArray(e) ? e : e ? [e] : []).filter((e => !!e)).map((e => String(e)))
                        }
                        static _makeKey(e, t, i) {
                            return e || [t.slice().sort().join(","), i.slice().sort().join(",")].join("|") || "default"
                        }
                        static addAppResources(t) {
                            return this._normalizeAliases(t).forEach((t => {
                                try {
                                    e.Base.resourceManager.addAppResource(t),
                                    this._addedAliases.add(t)
                                } catch (e) {
                                    console.warn("ResourceGate.addAppResource failed:", t, e)
                                }
                            }
                            )),
                            this
                        }
                        static addAppSources(t) {
                            return this._normalizeSources(t).forEach((t => {
                                try {
                                    e.Base.resourceManager.addAppSource(t),
                                    this._addedSources.add(t)
                                } catch (e) {
                                    console.warn("ResourceGate.addAppSource failed:", t, e)
                                }
                            }
                            )),
                            this
                        }
                        static loadOnce(t, i, a) {
                            const o = this._normalizeAliases(i)
                              , s = this._normalizeSources(a)
                              , n = this._makeKey(t, o, s);
                            if (this._promises.has(n))
                                return this._promises.get(n);
                            this.addAppResources(o),
                            this.addAppSources(s);
                            const r = Promise.resolve().then(( () => e.Base.resourceManager.load())).catch((t => {
                                throw this._promises.delete(n),
                                t
                            }
                            ));
                            return this._promises.set(n, r),
                            r
                        }
                        static clear(e) {
                            e ? this._promises.delete(e) : (this._promises.clear(),
                            this._addedAliases.clear(),
                            this._addedSources.clear())
                        }
                    }
                    ,
                    a._promises = new Map,
                    a._addedAliases = new Set,
                    a._addedSources = new Set,
                    t("ResourceGate", a)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/BaseHelperApp", ["./ResourceGate"], (function(t, i) {
            "use strict";
            var a, o, s, n;
            i && i.id,
            i && i.id;
            function r(e, t) {
                return new a(e._dummyElement,t && t.TwilightWarsConfig || {})
            }
            return {
                setters: [function(e) {
                    n = e
                }
                ],
                execute: function() {
                    a = e.TwilightWarsLib.events.definitions.TwilightWarsConfigDef,
                    o = e.CgEventsEngine.CgEventManager,
                    s = class extends PIXI.utils.EventEmitter {
                        constructor(t, i) {
                            super(),
                            s._activeApp && s._activeApp !== this && !s._activeApp.disposed && s._activeApp.dispose(),
                            s._activeApp = this,
                            this.path = t,
                            this.appUsage = i || {
                                usage: null,
                                params: {},
                                initJson: null
                            },
                            this.appUsage.params || (this.appUsage.params = {}),
                            this.subConfigs = [],
                            this.gameItems = [],
                            this.overwrite = !1,
                            this._disposed = !1,
                            this._pendingTimers = new Set,
                            this._initGeneration = 0,
                            this._messageHandler = e => this.onMessage(e),
                            e.Base.showCGPreloader(),
                            window.addEventListener("message", this._messageHandler, !1),
                            this.on("postData", this.on_requestJson, this),
                            this.on("closeEditor", this.closeEditor, this),
                            this.postMessage("requestData", {})
                        }
                        get disposed() {
                            return !!this._disposed
                        }
                        setTrackedTimeout(e, t) {
                            if (this._disposed)
                                return null;
                            const i = window.setTimeout(( () => {
                                this._pendingTimers.delete(i),
                                this._disposed || e()
                            }
                            ), t);
                            return this._pendingTimers.add(i),
                            i
                        }
                        delayResponse(t, i) {
                            this.setTrackedTimeout(( () => {
                                this.onMessage({
                                    data: {
                                        type: t,
                                        data: i
                                    }
                                })
                            }
                            ), 10)
                        }
                        postMessage(e, t) {
                            ("closeEditor" == e || !this._disposed) && window.parent && window.parent.postMessage({
                                type: "helperApp",
                                data: {
                                    type: e,
                                    path: this.path,
                                    data: t
                                }
                            }, "*")
                        }
                        addAppResources(e) {
                            return n.ResourceGate.addAppResources(e),
                            this
                        }
                        addAppSources(e) {
                            return n.ResourceGate.addAppSources(e),
                            this
                        }
                        loadResourcesOnce(e, t, i) {
                            return n.ResourceGate.loadOnce(e, t, i)
                        }
                        onMessage(e) {
                            if (this._disposed || !e || !e.data || !e.data.type)
                                return;
                            try {
                                let t = this["on_" + e.data.type];
                                t && t.call(this, e)
                            } catch (e) {
                                console.error(e)
                            }
                        }
                        applyInitResources(t) {
                            const i = t.resourcePack
                              , a = t.sources;
                            if (i)
                                for (let t in i.aliasMap) {
                                    let a = i.aliasMap[t]
                                      , o = a && i.resourceMap && i.resourceMap[a.resourceId];
                                    a && o && e.Base.overwriteAppResourceAlias(t, a, o)
                                }
                            if (a)
                                for (let t in a) {
                                    let i = a[t];
                                    i && e.Base.overwriteAppSource(t, i.type, i.url)
                                }
                            (i || a) && n.ResourceGate.clear()
                        }
                        on_initEditor(t) {
                            if (this._disposed)
                                return;
                            const i = ++this._initGeneration;
                            let a = t.data && t.data.data || {};
                            this.applyInitResources(a);
                            let s = new o;
                            if (this.config = r(s, a.config && a.config.configs),
                            this.subConfigs = [],
                            a.sources)
                                for (let e in a.sources) {
                                    let t = a.sources[e];
                                    "events" == t.type && t.configs && this.subConfigs.push(r(s, t.configs))
                                }
                            this.gameItems = a.items || [],
                            this.appUsage.initJson = void 0 === a.json ? null : a.json,
                            this.onConfigReady(this.config),
                            e.GLT.auth.onReady(( () => {
                                if (this._disposed || i !== this._initGeneration)
                                    return;
                                this.loadResourcesOnce("BaseHelperApp:init:" + (this.path || "") + ":" + (this.appUsage.usage || "") + ":" + i).then(( () => {
                                    if (this._disposed || i !== this._initGeneration)
                                        return;
                                    e.Base.hideCGPreloader(),
                                    this.onEditorInited()
                                }
                                )).catch((t => {
                                    this._disposed || (e.Base.hideCGPreloader(),
                                    console.error(t))
                                }
                                ))
                            }
                            ))
                        }
                        onConfigReady(e) {}
                        on_requestJson() {
                            if (this._disposed)
                                return;
                            let e = {
                                json: null
                            };
                            this.emit("requestJson", e),
                            this.overwrite ? this.postMessage("postJson", {
                                _overwrite: 1,
                                data: e.json
                            }) : this.postMessage("postJson", e.json)
                        }
                        onEditorInited() {}
                        closeEditor(e) {
                            this.postMessage("closeEditor", e),
                            this.dispose()
                        }
                        dispose() {
                            if (this._disposed)
                                return;
                            this._disposed = !0,
                            this._pendingTimers.forEach((e => window.clearTimeout(e))),
                            this._pendingTimers.clear(),
                            window.removeEventListener("message", this._messageHandler, !1),
                            this.off("postData", this.on_requestJson, this),
                            this.off("closeEditor", this.closeEditor, this);
                            try {
                                this.onDispose && this.onDispose()
                            } catch (e) {
                                console.error(e)
                            }
                            this.removeAllListeners && this.removeAllListeners(),
                            s._activeApp === this && (s._activeApp = null),
                            e.Base.hideCGPreloader()
                        }
                        destroy() {
                            this.dispose()
                        }
                    }
                    ,
                    s._activeApp = null,
                    t("BaseHelperApp", s)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/translations/trans.en", [], (function(t, i) {
            "use strict";
            i && i.id,
            i && i.id;
            return {
                setters: [],
                execute: function() {
                    t("tw_trans_en", 1),
                    e.Base.translation.getTranslation(e.Base.locales.LANG.EN).importJson({"label":{"officialRoles":"Twilight Wars Roles","userRoles":"User Made Roles","default":"Default","empty":"not set","allowMultiple":"Multiple (max {{max}})"},"btn":{"confirm":"Confirm","cancel":"Cancel"},"roleEditor":{"title":"Role Editor","tab":{"deco":"Deco","head":"Head","hand":"Hand","foot":"Foot","cape":"Cape"},"btn":{"importRole":"Import","downloadRole":"Download","buildRole":"New Design","buildRoleTip":"Open Role Editor","gotit":"Got it!","saveRole":"Save","buySlot":"Buy Slot","buySlotAgain":"Buy"},"hotkey":{"rotate":"Hotkey: C/V","scale":"Hotkey: Z/X","ratio":"Hotkey: shift + Z/X"},"noDesigns":"No custom design imported","buildRole":"Role Editor provides the tools to build your own charactor designs for your game. Once the design is build and saved in a .twrole file, upload the file to CG Resource, and you can assign the design to an AI in TwilightWarsEvents editor.","requireItemToSave":"You need to purchase this save slot to store your character.","requireItemToSaveAgain":"You need to purchase the editor of this slot to edit your character again.","roleModifed":"The design you have just uploaded was modified to fit the Camp.","labelBuyPrice":"Price","labelBuyAgainPrice":"Buy Again at","allowMultiSelect":"Hold Ctrl to add selection"},"gender":{"male":"Male","female":"Female"},"tw.label.civilFull":"Campless"})
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/translations/trans.zh", [], (function(t, i) {
            "use strict";
            i && i.id,
            i && i.id;
            return {
                setters: [],
                execute: function() {
                    t("tw_trans_zh", 1),
                    e.Base.translation.getTranslation(e.Base.locales.LANG.ZH).importJson({"label":{"officialRoles":"官方角色","userRoles":"同人角色","default":"預設","empty":"未指定","allowMultiple":"多選(最多{{max}})"},"btn":{"confirm":"確定","cancel":"取消"},"roleEditor":{"title":"光暈角色工坊","tab":{"deco":"頭飾","head":"頭型","hand":"手","foot":"腳","cape":"披風"},"btn":{"importRole":"載入角色","downloadRole":"下載檔案","buildRole":"創作角色","buildRoleTip":"打開光暈角色工坊","gotit":"知道了！","saveRole":"儲存角色","buySlot":"購買儲存格","buySlotAgain":"購買"},"hotkey":{"rotate":"熱鍵: C/V","scale":"熱鍵: Z/X","ratio":"熱鍵: shift + Z/X"},"noDesigns":"尚未載入自製角色","buildRole":"光暈角色工坊可供遊戲設計師製作遊戲中需要用到的自創角色造型。完成並下載角色檔案(.twrole)後，再利用CG上傳資源的功能，將角色載入專案資源後，就可以在這裏選擇自創的角色造型了。","requireItemToSave":"需要購買這個角色儲存格，才能儲存您的自創角色。","requireItemToSaveAgain":"需要購買這個角色儲存格的編輯器，才能再次編輯您的自創角色。","roleModifed":"您上傳的角色造型已被修改以符合目前的陣營設定。","labelBuyPrice":"首購價","labelBuyAgainPrice":"再次購買特價","allowMultiSelect":"按住 Ctrl 可加選"},"gender":{"male":"男性","female":"女性"},"tw.label.civilFull":"無關陣營"})
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/translations/trans.cn", [], (function(t, i) {
            "use strict";
            i && i.id,
            i && i.id;
            return {
                setters: [],
                execute: function() {
                    t("tw_trans_cn", 1),
                    e.Base.translation.getTranslation(e.Base.locales.LANG.ZH_CN).importJson({"label":{"officialRoles":"官方角色","userRoles":"同人角色","default":"预设","empty":"未指定","allowMultiple":"多选(最多{{max}})"},"btn":{"confirm":"确定","cancel":"取消"},"roleEditor":{"title":"光晕角色工坊","tab":{"deco":"头饰","head":"头型","hand":"手","foot":"脚","cape":"披风"},"btn":{"importRole":"载入角色","downloadRole":"下载档案","buildRole":"创作角色","buildRoleTip":"打开光晕角色工坊","gotit":"知道了！ ","saveRole":"储存角色","buySlot":"购买储存格","buySlotAgain":"购买"},"hotkey":{"rotate":"热键: C/V","scale":"热键: Z/X","ratio":"热键: shift + Z/X"},"noDesigns":"尚未载入自制角色","buildRole":"光晕角色工坊可供游戏设计师制作游戏中需要用到的自创角色造型。完成并下载角色档案(.twrole)后，再利用CG上传资源的功能，将角色载入专案资源后，就可以在这里选择自创的角色造型了。 ","requireItemToSave":"需要购买这个角色储存格，才能储存您的自创角色。 ","requireItemToSaveAgain":"需要购买这个角色储存格的编辑器，才能再次编辑您的自创角色。 ","roleModifed":"您上传的角色造型已被修改以符合目前的阵营设定。 ","labelBuyPrice":"首购价","labelBuyAgainPrice":"再次购买特价","allowMultiSelect":"按住 Ctrl 可加选"},"gender":{"male":"男性","female":"女性"},"tw.label.civilFull":"无关阵营"})
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/roleeditor/RoleEditor", ["./DecoManager", "./DecoItem", "./fixIngameRoleDesign", "./DecoConstant"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g, f, I, w, R, b, y, E, C, T, S, x, W, A, M, v, B, D, P, k, U, L, O, F, N, _, G, H, X = this && this.__awaiter || function(e, t, i, a) {
                return new (i || (i = Promise))((function(o, s) {
                    function n(e) {
                        try {
                            l(a.next(e))
                        } catch (e) {
                            s(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(a.throw(e))
                        } catch (e) {
                            s(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? o(e.value) : (t = e.value,
                        t instanceof i ? t : new i((function(e) {
                            e(t)
                        }
                        ))).then(n, r)
                    }
                    l((a = a.apply(e, t || [])).next())
                }
                ))
            }
            ;
            i && i.id,
            i && i.id;
            function J(e, t) {
                return L.find((t => t.code == e)).getDefaultFrame(t)
            }
            function q(t, i) {
                if (e.Base.system.timeElapsedThisFrame > 60)
                    return e.Base.wait(10).then(( () => q(t, i)));
                let a, o = t.code + "/" + i;
                if (U[o])
                    return Promise.resolve(U[o]);
                if (t.useFrame) {
                    let o = "lib_actor_" + t.code;
                    a = e.Base.resourceManager.createGAFMovieClip("TwilightWarsLib.actors", o),
                    a.gotoAndStop(i)
                } else
                    a = e.Base.resourceManager.createGAFMovieClip("TwilightWarsLib.role_decorations", i);
                let s = a.getBounds();
                return e.Base.pixi.displayObjectToDataUrl(a, {
                    mime: "image/png",
                    bgAlpha: 0
                }).then((e => {
                    a.destroy();
                    let t = {
                        code: i,
                        dataUrl: e,
                        pivot: new PIXI.Point(-s.x,-s.y)
                    };
                    return U[o] = t,
                    t
                }
                ))
            }
            function V(e, t) {
                let i;
                if (t.isHead()) {
                    let t = L.find((e => "head" == e.code))
                      , a = e.head.frame;
                    i = t.options && t.options.find((e => e.code == a))
                } else {
                    let e = L.find((e => "deco" == e.code));
                    i = e.options && e.options.find((e => e.code == t.code))
                }
                return i && i.dataUrl
            }
            function Y(e) {
                return {
                    f: e.frame,
                    s: e.clip.scaleX
                }
            }
            function j() {
                return B.isOnSteam()
            }
            function parseRoleEditorRangeString(e) {
                const t = new Set;
                if (!e)
                    return [];
                return String(e).split(",").forEach((e => {
                    const i = e.trim();
                    if (!i)
                        return;
                    if (i.includes("-")) {
                        const e = i.split("-").map(Number)
                          , a = e[0]
                          , o = e[1];
                        if (!isNaN(a) && !isNaN(o))
                            for (let e = Math.min(a, o); e <= Math.max(a, o); e++)
                                t.add(e)
                    } else {
                        const e = Number(i);
                        isNaN(e) || t.add(e)
                    }
                }
                )),
                Array.from(t)
            }
            function getRoleEditorItems(e) {
                return e && e.items ? e.items : []
            }
            function getRoleEditorDraggingIndexes(e, t) {
                const i = getRoleEditorItems(e);
                return (t || []).map((e => i.indexOf(e))).filter((e => e >= 0))
            }
            function moveRoleEditorDraggingDecos(e, t, i) {
                const a = getRoleEditorItems(e);
                if (!a.length)
                    return !1;
                const o = (t || []).filter((e => a.includes(e)));
                if (!o.length)
                    return !1;
                const s = o.slice().sort(((e, t) => a.indexOf(e) - a.indexOf(t)));
                let n = i;
                return s.forEach((t => {
                    e.setDecoIndex(t, n),
                    n++
                }
                )),
                !0
            }
            function getRoleEditorSelectableDecos(e, t) {
                return (e || []).filter((e => e && !(e.isHead && e.isHead()) && !(t && t.has(e))))
            }
            function sortRoleEditorDecosByLayer(e, t) {
                const i = new Map;
                return (t || []).forEach(((e, t) => i.set(e, t))),
                (e || []).slice().sort(((e, t) => (i.has(e) ? i.get(e) : 0) - (i.has(t) ? i.get(t) : 0)))
            }
            function createRoleEditorGroupSnapshot(e, t, i) {
                const a = new Map;
                return (t || []).forEach(((e, t) => a.set(e, t))),
                (e || []).map((e => {
                    const t = {
                        id: e.id,
                        name: e.name,
                        visible: e.visible,
                        collapsed: e.collapsed
                    };
                    return t[i || "items"] = (e.items || []).map((e => a.get(e))).filter((e => void 0 !== e && e >= 0)),
                    t
                }
                ))
            }
            function restoreRoleEditorGroupsFromSnapshot(e, t, i) {
                const a = i || new Map;
                a.clear && a.clear();
                const o = [];
                let s = 0;
                return (e || []).forEach((e => {
                    const i = Array.isArray(e.itemIndexes) ? e.itemIndexes : e.items || []
                      , n = i.map((e => t[e])).filter((e => !!e));
                    if (n.length) {
                        const t = {
                            id: e.id,
                            name: e.name || "",
                            visible: e.visible !== !1,
                            collapsed: !!e.collapsed,
                            items: n
                        };
                        "number" == typeof t.id && (s = Math.max(s, t.id)),
                        o.push(t),
                        n.forEach((e => {
                            a.set(e, t),
                            e.clip && (e.clip.visible = t.visible)
                        }
                        ))
                    }
                }
                )),
                {
                    groups: o,
                    map: a,
                    maxNumericId: s
                }
            }
            function syncRoleEditorGroupsWithDecos(e, t, i) {
                const a = new Set(t || [])
                  , o = i || new Map
                  , s = [];
                return o.clear && o.clear(),
                (e || []).forEach((e => {
                    const i = (e.items || []).filter((e => a.has(e)));
                    i.length && (e = Object.assign({}, e, {
                        items: i
                    }),
                    i.forEach((t => {
                        o.set(t, e),
                        t.clip && (t.clip.visible = e.visible !== !1)
                    }
                    )),
                    s.push(e))
                }
                )),
                s
            }
            function getRoleEditorPasteInsertIndex(e, t) {
                const i = e || []
                  , a = t && t.length ? t : [];
                if (a.length) {
                    const e = a.map((e => i.indexOf(e))).filter((e => e >= 0));
                    if (e.length) {
                        const t = Math.max(...e) + 1;
                        return Math.min(Math.max(t, 0), i.length)
                    }
                }
                return i.length
            }
            function getRoleEditorLayerRenderRange(e, t, i, a, o) {
                const s = Math.max(0, e || 0)
                  , n = Math.max(1, t || 1)
                  , r = Math.max(0, i || 0)
                  , l = Math.max(r, a || r);
                return {
                    start: o ? Math.max(0, s - r) : Math.max(0, s - l),
                    end: s + n
                }
            }
            function isRoleEditorVirtualRowVisible(e, t, i, a, o) {
                return !!o || e < a && e + t > i
            }
            return t("showRoleEditorScreen", (function(t) {
                _ && !G || (G && G.handleClose(),
                H || ($(s.renderer.view).css("z-index", "unset"),
                $(s.renderer.view).css("position", "relative"),
                $(s.renderer.view).css("pointer-events", "all"),
                s.stageAlignHorizontal = o.ALIGN_HORIZONTAL.CENTER,
                s.stageAlignVertical = o.ALIGN_VERTICAL.MIDDLE,
                s.stageResolutionPolicy = o.RESOLUTION_POLICY.SHOW_ALL,
                H = !0,
                e.Base.addInlineStyles("\n.piece {\n    width: 10em; height: 8.66em;\n    background: radial-gradient(ellipse,#71829230,#718292);\n}\n.piece {\n    position: relative;\n    margin: 4em auto;\n    transform: rotate(-30deg) skewX(30deg);\n}\n.piece:before, .piece:after {\n    position: absolute;\n    width: inherit;\n\theight: inherit;\n    background: inherit;\n    content: '';\n}\n.piece:before {\n    transform: skewX(-30deg) skewX(-30deg);\n}\n.piece:after {\n    transform: skewX(-30deg) rotate(-60deg) skewX(-30deg);\n}\n.piece.piece2 {\n\tbackground: #203a51;\n\tposition: absolute;\n\ttop: -46px;\n\tright: 40px;\n\tzoom: 0.8;\n}\ninput[type=range] {\n    background: none;\n    height: 25px;\n    -webkit-appearance: none;\n}\ninput[type=range]:focus {\n    outline: none;\n}\ninput[type=range]::-webkit-slider-runnable-track {\n    width: 100%;\n    height: 5px;\n    cursor: pointer;\n    box-shadow: 0px 0px 0px #000000;\n    background: #2497E3;\n    border-radius: 1px;\n    border: 0px solid #000000;\n}\ninput[type=range]::-webkit-slider-thumb {\n    height: 15px;\n    width: 15px;\n    border-radius: 100%;\n    background: white;\n    cursor: pointer;\n    -webkit-appearance: none;\n    margin-top: -5px;\n}\ninput[type=range]:focus::-webkit-slider-runnable-track {\n    background: #2497E3;\n}\n.editFunction input[disabled], .editFunction button[disabled] {\n\topacity: 0.2;\n\tpointer-events: none;\n}\n::-webkit-scrollbar {\n    width: 10px;\n}\n::-webkit-scrollbar-thumb {\n    background: rgba(255,255,255,.7);\n}")),
                _ = e.ReactMaterial.renderComponentWithStyle({
                    bg: {},
                    window: {
                        width: "90%",
                        height: "90%",
                        position: "absolute",
                        right: 0,
                        left: 0,
                        bottom: 0,
                        top: 0,
                        margin: "auto",
                        background: "linear-gradient(#003949, black)",
                        border: "3.5px solid #cacaca",
                        borderRadius: 20,
                        "& .hidden": {
                            display: "none"
                        },
                        "& .button": {
                            cursor: "pointer"
                        },
                        "& .windowTitle": {
                            margin: "auto",
                            marginTop: -22,
                            fontSize: 20,
                            right: 0,
                            left: 0,
                            position: "absolute",
                            width: "fit-content",
                            background: "linear-gradient(black,#003949)",
                            padding: 5,
                            paddingRight: 20,
                            paddingLeft: 20
                        },
                        "& .menuBar": {
                            padding: "10px 20px",
                            zIndex: "1",
                            position: "relative",
                            display: "flex",
                            "& .btns": {
                                display: "flex",
                                alignItems: "center"
                            },
                            "& button": {
                                background: "#00627d",
                                marginRight: 15,
                                "&.btn-save-more": {
                                    paddingLeft: 5,
                                    paddingRight: 5,
                                    marginLeft: -13,
                                    minWidth: "unset"
                                }
                            },
                            "& .does-btns": {
                                "& button": {
                                    marginRight: 0,
                                    background: "transparent",
                                    color: "#ddd"
                                }
                            },
                            "& .locked": {
                                filter: "grayscale(80%)"
                            },
                            "& .dropdown": {
                                color: "white",
                                marginLeft: 15,
                                "& .MuiSelect-icon": {
                                    color: "#FFF"
                                },
                                "&.Mui-disabled .MuiSelect-icon": {
                                    opacity: 0
                                }
                            }
                        },
                        "& .topBar": {
                            display: "flex",
                            borderBottom: "2px solid",
                            padding: "0 10px",
                            zIndex: "1",
                            position: "relative"
                        },
                        "& .topBarButton": {
                            color: "#ccc",
                            margin: "0 5px",
                            border: "2px solid white",
                            borderBottom: "none",
                            width: "20%",
                            textAlign: "center",
                            paddingBottom: 5,
                            paddingTop: 5,
                            borderTopRightRadius: 7,
                            borderTopLeftRadius: 7,
                            fontSize: 16,
                            background: "linear-gradient(black,#003949)",
                            "&:hover": {
                                color: "lightgreen"
                            },
                            "&.selected": {
                                background: "radial-gradient(ellipse,#2b7186c2,#41c7f0)",
                                color: "white",
                                fontWeight: "bold"
                            }
                        },
                        "& .bottomBody": {
                            display: "flex",
                            height: "calc(100% - 125px)",
                            margin: 15
                        }
                    },
                    editBlock: {
                        flex: 1,
                        height: "100%",
                        position: "relative",
                        minWidth: "300px",
                        overflow: "hidden",
                        "& .editFunction": {
                            position: "absolute",
                            bottom: 0,
                            left: "5%",
                            right: "5%",
                            zIndex: 1,
                            "& .tool": {
                                display: "flex",
                                placeContent: "space-between",
                                "& button": {
                                    color: "white"
                                }
                            },
                            "& .rangeRoot": {
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                "& .rangeBox": {
                                    display: "flex",
                                    alignItems: "center",
                                    marginTop: 5,
                                    position: "relative"
                                },
                                "& input": {
                                    marginLeft: "2%",
                                    flex: 1
                                }
                            },
                            "&.disabled .rangeIcon": {
                                opacity: .2
                            },
                            "& .btn-input-box": {
                                cursor: "pointer"
                            },
                            "&.disabled .btn-input-box": {
                                opacity: .2
                            },
                            "& .input-box": {
                                position: "absolute",
                                right: 0,
                                width: 80,
                                zIndex: 9,
                                background: "#333",
                                borderRadius: 5,
                                "& input": {
                                    padding: "8px 6px",
                                    color: "#eee",
                                    textAlign: "right"
                                }
                            }
                        }
                    },
                    stageBg: {
                        position: "relative",
                        width: 195,
                        left: "50%",
                        top: "24%"
                    },
                    stage: {
                        position: "fixed",
                        left: 0,
                        top: 0,
                        width: "100vw",
                        height: "100vh"
                    },
                    choiceList: {
                        position: "relative",
                        width: "42%",
                        minWidth: "250px",
                        maxWidth: "70%",
                        height: "100%",
                        background: "#eceeef4f",
                        border: "2px solid #dadada",
                        zIndex: 2,
                        overflow: "auto",
                        resize: "horizontal",
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        "& .loading": {
                            position: "fixed",
                            top: 0,
                            right: 0,
                            width: "100%",
                            height: "100%",
                            background: "rgba(0,0,0,0.7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        },
                        "& .material": {
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            userSelect: "none",
                            height: "max-content"
                        },
                        "& .choiceBlock": {
                            width: 50,
                            height: 50,
                            background: "radial-gradient(circle,#145f6a,#25313a)",
                            border: "2px solid grey",
                            display: "grid",
                            padding: 10,
                            margin: 5,
                            "&.selected": {
                                background: "radial-gradient(circle, rgb(37, 49, 58), rgb(53, 208, 255))"
                            },
                            "&:hover": {
                                borderColor: "lightgreen"
                            },
                            "& img": {
                                maxWidth: 50,
                                maxHeight: 50,
                                display: "block",
                                top: 0,
                                right: 0,
                                left: 0,
                                bottom: 0,
                                margin: "auto"
                            }
                        }
                    },
                    editList: {
                        zIndex: 1,
                        background: "#eceeef4f",
                        border: "2px solid #dadada",
                        width: "20%",
                        minWidth: "200px",
                        maxWidth: "50%",
                        height: "100%",
                        overflowY: "scroll",
                        overflowX: "hidden",
                        resize: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "relative",
                        "& .right-resizer": {
                            left: 0,
                            width: 16,
                            height: 16,
                            cursor: "ew-resize",
                            alignSelf: "flex-start",
                            flexShrink: 0,
                            zIndex: 5,
                            background: "linear-gradient(135deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0) 50%)"
                        },
                        "& .paddingBlock": {
                            padding: 5
                        },
                        "& .spacerBlock": {
                            flex: 1,
                            width: 78
                        },
                        "& .dragBlock": {
                            border: "2px dashed transparent",
                            marginBottom: 6,
                            position: "relative",
                            display: "grid",
                            "& .delete": {
                                position: "absolute",
                                right: -6,
                                top: -6,
                                zoom: .7,
                                padding: 5,
                                background: "#007fa0",
                                color: "white"
                            },
                            "& .delete:hover": {
                                background: "#00627b"
                            },
                            "& .layerBadge": {
                                position: "absolute",
                                top: -10,
                                left: -10,
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: "rgba(0, 0, 0, 0.75)",
                                color: "#fff",
                                border: "2px solid rgba(255,255,255,0.9)",
                                fontSize: 12,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 4px rgba(0,0,0,0.4)",
                                pointerEvents: "none",
                                zIndex: 2
                            },
                            "&.dragging": {
                                border: "2px dashed rgb(64, 220, 243)",
                                "& .choiceBlock": {
                                    opacity: .1
                                },
                                "& .delete": {
                                    display: "none"
                                }
                            },
                            "&.inserting": {
                                border: "1px dotted rgba(64, 220, 243, 0.5)",
                                "& .delete": {
                                    display: "none"
                                }
                            },
                            "& .choiceBlock": {
                                width: 50,
                                height: 50,
                                padding: 10,
                                background: "radial-gradient(circle,#145f6a,#25313a)",
                                border: "2px solid grey",
                                display: "grid",
                                "&.selected": {
                                    background: "radial-gradient(circle, rgb(37, 49, 58), rgb(53, 208, 255))"
                                },
                                "&:hover": {
                                    borderColor: "lightgreen"
                                },
                                "& img": {
                                    maxWidth: 50,
                                    maxHeight: 50,
                                    display: "block",
                                    top: 0,
                                    right: 0,
                                    left: 0,
                                    bottom: 0,
                                    margin: "auto"
                                }
                            },
                            "& .material": {
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                userSelect: "none",
                                height: "max-content"
                            },
                            "&.inserting .choiceBlock": {
                                background: "none"
                            }
                        }
                    }
                }, N, {
                    emitter: t.emitter,
                    appUsage: t.appUsage,
                    ingame: t.ingame
                }))
            }
            )),
            {
                setters: [function(e) {
                    p = e
                }
                , function(e) {
                    u = e
                }
                , function(e) {
                    T = e
                }
                , function(e) {
                    x = e
                }
                ],
                execute: function() {
                    a = e.TwilightWarsLib.games.configs.RoleDecosList,
                    o = e.Base.pixis.Pixi,
                    s = e.Base.pixi,
                    n = e.TwilightWarsLib.games.displays.ActorClip,
                    r = e.TwilightWarsLib.games.dummyGame,
                    l = e.TwilightWarsLib.games.datas.RoleSet,
                    c = e.Base.translation.translate,
                    d = e.TwilightWarsLib.games.datas.RoleDesignData,
                    h = e.TwilightWarsLib.games.displays.roleDecos.RoleDecosConfig,
                    m = e.Base.utils.HtmlUtil,
                    g = e.Base.utils.MathUtil,
                    f = e.TwilightWarsLib.games.datas.Camp,
                    I = e.TwilightWarsLib.games.displays.ActorCape,
                    w = e.TwilightWarsLib.games.displays.ActorHead,
                    R = e.TwilightWarsLib.games.displays.ActorFoot,
                    b = e.TwilightWarsLib.games.displays.ActorHand,
                    y = e.TwilightWarsLib.games.displays.roleDecos.RoleDeco,
                    E = e.TwilightWarsLib.games.audio.Sfx,
                    C = e.TwilightWarsLib.myProfile,
                    S = e.Base.utils.IntUtil,
                    W = e.Base.keyboardManager,
                    A = e.Base.keyboard.KeyboardManagerEvent,
                    M = e.Base.keyboard.Key,
                    v = e.Base.utils.ArrayUtil,
                    B = e.GLT.client,
                    D = e.Server.utils.SteamUtil,
                    t("RolePartOption", P = class {
                        constructor(e, t, i) {
                            this.code = e,
                            this.dataUrl = t,
                            this.pivot = i
                        }
                    }
                    ),
                    U = {},
                    L = [new (k = class {
                        constructor(e, t) {
                            this.code = e,
                            this.useFrame = t,
                            this.loading = !1
                        }
                        reset(e) {
                            this.loading = !1,
                            this.options = null,
                            this.camp = e
                        }
                        prepareOptions() {
                            let e, t = this.camp;
                            if (this.options && this.__lastCamp === t) {
                                return Promise.resolve(this.options);
                            }
                            this.loading = !0;
                            if (t == f.CAMP4) {
                                e = [];
                                f.listAll().forEach((t => {
                                    e = e.concat(a[this.code][t.code])
                                }));
                            } else {
                                e = a[this.code][t.code].slice();
                            }
                            if ("cape" == this.code) {
                                e.unshift(I.EMPTY_FRAME);
                            } else if (t == f.CAMP4) {
                                if ("head" == this.code) e.unshift(w.EMPTY_FRAME);
                                else if ("hand" == this.code) e.unshift(b.EMPTY_FRAME);
                                else if ("foot" == this.code) e.unshift(R.EMPTY_FRAME);
                            }
                            return Promise.all(e.map((e => q(this, e)))).then((e => {
                                if (this.camp == t) {
                                    this.options = e.map((e => new P(e.code,e.dataUrl,e.pivot)));
                                    this.__lastCamp = t;
                                    this.loading = !1;
                                }
                            })).catch(err => {
                                console.error("Error preparing options for " + this.code + ":", err);
                                this.loading = !1;
                            });
                        }
                        getDefaultFrame(e) {
                            return e == f.CAMP4 && (e = f.CAMP1),
                            a[this.code][e.code][0]
                        }
                    }
                    )("deco",!1), new k("head",!0), new k("cape",!0), new k("hand",!0), new k("foot",!0)],
                    O = [],
                    (F = class e {
                        static getByCode(t) {
                            return O.find((e => e.code == t)) || e.MALE
                        }
                        constructor(e, t) {
                            this.code = e,
                            this.female = t,
                            O.push(this)
                        }
                        get name() {
                            return c("gender." + this.code)
                        }
                    }
                    ).MALE = new F("male",!1),
                    F.FEMALE = new F("female",!0),
                    N = class extends React.Component {
                        constructor(t) {
                            super(t),
                            this._unmounted = !1,
                            this._rawSetState = this.setState.bind(this),
                            this.setState = (e, t) => {
                                if (this._unmounted)
                                    return null;
                                return this._rawSetState(e, t)
                            }
                            ,
                            this.actorStage = new PIXI.Container,
                            this.actorClip = new n(r),
                            this.stageBgRef = React.createRef(),
                            this.stageRef = React.createRef(),
                            this.editListRef = React.createRef(),
                            this.fileInputRef = React.createRef(),
                            this.rotateInputRef = React.createRef(),
                            this.scaleInputRef = React.createRef(),
                            this.ratioInputRef = React.createRef(),
                            this.mergeFileInputRef = React.createRef(),
                            this.choiceListRef = React.createRef(),
                            this.partInfiScroll = null,
                            this.partChoiceElByCode = new Map,
                            this.selectedChoiceEl = null,
                            this.dragcount = 0,
                            this.positionInputEdited = !1,
                            this.copiedDecos = [],
                            this.pasteOffset = 0,
                            this.currentDraggingDecos = [],
                            this.groupIdCounter = 1,
                            this.decoGroupMap = new Map,
                            this.stageMaxScale = 6,
                            this.stageMinScale = 1,
                            this.baseDevicePixelRatio = window.devicePixelRatio || 1,
                            this.history = [],
                            this.historyIndex = -1,
                            this._lastHistorySignature = null,
                            this._historyMutationVersion = 0,
                            this._lastHistoryVersion = -1,
                            this._historyBatchDepth = 0,
                            this._historyBatchDirty = !1,
                            this._rangeHistoryBatchActive = !1,
                            this._pendingTimers = new Set,
                            this.rightResizeActive = !1,
                            this.rightResizeParentRect = null,
                            this.setTrackedTimeout = (fn, delay = 0) => {
                                if (this._unmounted)
                                    return null;
                                const timer = window.setTimeout((() => {
                                    this._pendingTimers.delete(timer),
                                    this._unmounted || fn()
                                }
                                ), delay);
                                return this._pendingTimers.add(timer),
                                timer
                            }
                            ,
                            this.getSortableAnimation = () => (this.state && this.state.decos && this.state.decos.length > 120 ? 0 : 100)
                            ,
                            this.onRangeInputStart = () => {
                                this._rangeHistoryBatchActive || (this._rangeHistoryBatchActive = !0,
                                this.beginHistoryBatch())
                            }
                            ,
                            this.onRangeInputChange = () => {
                                this._rangeHistoryBatchActive && (this._rangeHistoryBatchActive = !1,
                                this.commitHistoryBatch()),
                                this._historyBatchDepth || this.pushHistory()
                            }
                            ,
                            this.releaseSliderFocus = e => {
                                this.onRangeInputChange();
                                const t = e && (e.currentTarget || e.target);
                                t && "function" == typeof t.blur && this.setTrackedTimeout((() => t.blur()), 0)
                            }
                            ,
                            this.isTextEditableTarget = e => {
                                if (!e || e.disabled)
                                    return !1;
                                if (e.isContentEditable)
                                    return !0;
                                const t = e.tagName;
                                if ("TEXTAREA" === t)
                                    return !e.readOnly;
                                if ("INPUT" !== t)
                                    return !1;
                                const i = String(e.type || "text").toLowerCase();
                                return !e.readOnly && !["range", "checkbox", "radio", "button", "submit", "reset", "file", "image", "color", "hidden"].includes(i)
                            }
                            ,
                            this.getSizePx = (value, base, fallback = 0) => {
                                if (!value || value === "auto")
                                    return fallback;
                                if ("string" == typeof value && value.trim().endsWith("%")) {
                                    const pct = parseFloat(value);
                                    return isNaN(pct) ? fallback : base * pct / 100;
                                }
                                const num = parseFloat(value);
                                return isNaN(num) ? fallback : num
                            }
                            ,
                            this.onRightResizeStart = e => {
                                const t = this.editListRef.current;
                                if (!t || !t.parentElement)
                                    return;
                                e && e.preventDefault && e.preventDefault();
                                this.rightResizeActive = !0,
                                this.rightResizeParentRect = t.parentElement.getBoundingClientRect(),
                                document.addEventListener("mousemove", this.onRightResizeMove),
                                document.addEventListener("mouseup", this.onRightResizeEnd),
                                document.addEventListener("touchmove", this.onRightResizeMove, {
                                    passive: !1
                                }),
                                document.addEventListener("touchend", this.onRightResizeEnd)
                            }
                            ,
                            this.onRightResizeMove = e => {
                                if (!this.rightResizeActive)
                                    return;
                                const t = this.editListRef.current;
                                if (!t || !t.parentElement)
                                    return;
                                let i = e;
                                e && e.touches && e.touches.length && (i = e.touches[0]),
                                e && e.cancelable && e.preventDefault && e.preventDefault();
                                const a = this.rightResizeParentRect || t.parentElement.getBoundingClientRect();
                                let o = a.right - i.clientX;
                                const s = window.getComputedStyle(t)
                                  , n = this.getSizePx(s.minWidth, a.width, 150)
                                  , r = this.getSizePx(s.maxWidth, a.width, a.width);
                                o = Math.max(n, Math.min(r, o)),
                                t.style.width = o + "px",
                                this.updateActorPosition && this.updateActorPosition()
                            }
                            ,
                            this.onRightResizeEnd = () => {
                                this.rightResizeActive = !1,
                                this.rightResizeParentRect = null,
                                document.removeEventListener("mousemove", this.onRightResizeMove),
                                document.removeEventListener("mouseup", this.onRightResizeEnd),
                                document.removeEventListener("touchmove", this.onRightResizeMove),
                                document.removeEventListener("touchend", this.onRightResizeEnd)
                            }
                            ,
                            this.mirrorCopySelectedDeco = mode => {
                                if (!this.decoManager)
                                    return;
                                const selected = (this.state.selectedDecos || []).filter(deco => deco && deco.clip && !(deco.isHead && deco.isHead()));
                                if (!selected.length)
                                    return;
                                const isVertical = "vertical" === mode;
                                const newDecos = [];
                                let insertIndex = this.getCreateInsertIndex("copy", (() => this.decoManager && this.decoManager.items ? this.decoManager.items.length : 0));
                                selected.forEach((deco => {
                                    const originalClip = deco.clip
                                      , newDeco = this.decoManager.addDeco(deco.code, insertIndex, !0);
                                    if (!newDeco || !newDeco.clip)
                                        return;
                                    const newX = isVertical ? originalClip.x : -originalClip.x
                                      , newY = isVertical ? -originalClip.y : originalClip.y
                                      , newScaleX = isVertical ? originalClip.scale.x : -originalClip.scale.x
                                      , newScaleY = isVertical ? -originalClip.scale.y : originalClip.scale.y;
                                    newDeco.clip.position.set(newX, newY),
                                    newDeco.clip.scale.set(newScaleX, newScaleY),
                                    newDeco.clip.rotation = -originalClip.rotation,
                                    newDecos.push(newDeco),
                                    insertIndex++
                                }
                                )),
                                newDecos.length && this.setState({
                                    decos: this.decoManager.items
                                }, (() => {
                                    this.decoManager.selectDecos(newDecos),
                                    this.refreshEditValues(),
                                    this.commitHistoryMutation()
                                }
                                ))
                            }
                            ,
                            this.copySelectedDecos = () => {
                                const selected = (this.state.selectedDecos || []).filter((e => e && e.clip && !(e.isHead && e.isHead())));
                                selected.length && (this.copiedDecos = selected.map((e => ({
                                    code: e.code,
                                    x: e.clip ? e.clip.x : 0,
                                    y: e.clip ? e.clip.y : 0,
                                    scaleX: e.clip ? e.clip.scale.x : 1,
                                    scaleY: e.clip ? e.clip.scale.y : 1,
                                    rotation: e.clip ? e.clip.rotation : 0
                                }))),
                                this.pasteOffset = 0)
                            }
                            ,
                            this.pasteCopiedDecos = () => {
                                if (!this.decoManager || !this.copiedDecos || !this.copiedDecos.length)
                                    return;
                                const newItems = [];
                                //this.pasteOffset = (this.pasteOffset || 0) + 5;
                                this.pasteOffset = (this.pasteOffset || 0) ;
                                const offset = this.pasteOffset;
                                let insertIndex = this.getCreateInsertIndex("copy", (() => this.getPasteInsertIndex()));
                                this.copiedDecos.forEach((data => {
                                    if (!data || !data.code)
                                        return;
                                    const newItem = this.decoManager.addDeco(data.code, insertIndex, !0);
                                    newItem && newItem.clip && (newItem.clip.position.set(data.x + offset, data.y + offset),
                                    newItem.clip.scale.set(data.scaleX, data.scaleY),
                                    newItem.clip.rotation = data.rotation,
                                    newItems.push(newItem),
                                    insertIndex++)
                                }
                                )),
                                newItems.length && this.setState({
                                    decos: this.decoManager.items
                                }, (() => {
                                    this.decoManager.selectDecos(newItems),
                                    this.refreshEditValues(),
                                    this.commitHistoryMutation()
                                }
                                ))
                            }
                            ,
                            this.groupSelectedDecos = () => {
                                var e = getRoleEditorSelectableDecos(this.state.selectedDecos, this.decoGroupMap);
                                if (e.length < 2)
                                    return;
                                e = sortRoleEditorDecosByLayer(e, this.state.decos || []);
                                var t = this.groupIdCounter++
                                  , i = c("roleEditor.group.defaultName");
                                (!i || i.startsWith("roleEditor.")) && (i = "Group");
                                var a = {
                                    id: t,
                                    name: i + " " + t,
                                    items: e.slice(),
                                    visible: !0,
                                    collapsed: !1
                                };
                                e.forEach((e => this.decoGroupMap.set(e, a))),
                                this.setState({
                                    decoGroups: [...(this.state.decoGroups || []), a]
                                }, (() => this.commitHistoryMutation()))
                            }
                            ,
                            this.setGroupVisibility = (e, t) => {
                                if (!e)
                                    return;
                                const i = (this.state.decoGroups || []).map((a => a === e ? Object.assign({}, a, {
                                    visible: t !== !1
                                }) : a));
                                i.forEach((e => (e.items || []).forEach((t => {
                                    t && this.decoGroupMap.set(t, e),
                                    t && t.clip && (t.clip.visible = e.visible !== !1)
                                }
                                )))),
                                this.setState({
                                    decoGroups: i
                                }, (() => this.commitHistoryMutation()))
                            }
                            ,
                            this.toggleGroupVisibility = e => {
                                e && this.setGroupVisibility(e, e.visible === !1)
                            }
                            ,
                            this.ungroupDecoGroup = e => {
                                if (!e) return;
                                e.items.forEach((item => {
                                    if (item) {
                                        if (item.clip) item.clip.visible = true;
                                        this.decoGroupMap.delete(item);
                                    }
                                }));
                                this.setState({
                                    decoGroups: (this.state.decoGroups || []).filter((t => t !== e))
                                }, () => this.commitHistoryMutation());
                            }
                            ,
                            this.syncDecoGroups = e => syncRoleEditorGroupsWithDecos(this.state.decoGroups || [], e || [], this.decoGroupMap)
                            ,
                            this.getPasteInsertIndex = () => {
                                var e, t;
                                return getRoleEditorPasteInsertIndex((null === (e = this.decoManager) || void 0 === e ? void 0 : e.items) || [], (null === (t = this.state.selectedDecos) || void 0 === t ? void 0 : t.length) ? this.state.selectedDecos : [])
                            }
                            ,
                            this.onChoiceBlockDragLeave = () => {
                                this.dragcount--,
                                e.Base.wait(100).then(( () => {
                                    0 == this.dragcount && (this.removeInsertItem(),
                                    this.setState({
                                        decos: this.decoManager.items
                                    }))
                                }
                                ))
                            }
                            ,
                            this.removeDeco = e => {
                                this.decoManager.selectDecos([]),
                                this.decoManager.removeDeco(e),
                                this.commitHistoryMutation()
                            }
                            ,
                            this.cancelSelectedDeco = () => {
                                this.decoManager.selectDecos([])
                            }
                            ,
                            this.flipSelectedDeco = () => {
                                if (this.state.selectedDecos.length) {
                                    let e = this.decoManager.decoController;
                                    e.setScale(-e.container.scaleX, e.container.scaleY),
                                    this.refreshEditValues(),
                                    this.commitHistoryMutation()
                                }
                            }
                            ,
                            this.rotateSelectedDeco = e => {
                                if (this.state.selectedDecos.length) {
                                    let t = g.normalizeDegrees(Number(e.target.value));
                                    this.decoManager.decoController.setRotationDeg(t),
                                    this.refreshEditValues(),
                                    this.markHistoryDirty()
                                }
                            }
                            ,
                            this.scaleSelectedDeco = e => {
                                if (this.state.selectedDecos.length) {
                                    let t = Number(e.target.value)
                                      , i = this.decoManager.decoController.container
                                      , a = i.scaleX > 0 ? 1 : -1
                                      , o = Math.abs(i.scaleY / i.scaleX);
                                    this.decoManager.decoController.setScale(t * a, t * o),
                                    this.refreshEditValues(),
                                    this.markHistoryDirty()
                                }
                            }
                            ,
                            this.ratioSelectedDeco = e => {
                                if (this.state.selectedDecos.length) {
                                    let t = Number(e.target.value)
                                      , i = this.decoManager.decoController.container;
                                    this.decoManager.decoController.setScale(i.scaleX, Math.abs(i.scaleX) * t),
                                    this.refreshEditValues(),
                                    this.markHistoryDirty()
                                }
                            }
                            ,
                            this.zoomInStage = () => {
                                this.setStageScale(Math.min(this.stageMaxScale, this.actorStage.scaleX + 1))
                            }
                            ,
                            this.zoomOutStage = () => {
                                this.setStageScale(Math.max(this.stageMinScale, this.actorStage.scaleX - 1))
                            }
                            ,
                            this.onCampSelected = e => {
                                let t = this.state.ingame ? this.state.ingame.role.defaultRole.defaultCamp : f.getByCode(e.target.value)
                                  , i = this.exportConfig();
                                this.setCampAndGender(t, this.state.selectedGender, i),
                                this.commitHistoryMutation()
                            }
                            ,
                            this.onGenderSelected = e => {
                                let t = F.getByCode(e.target.value)
                                  , i = this.exportConfig();
                                this.setCampAndGender(this.state.selectedCamp, t, i),
                                t.female ? E.GIRL_DEAD.play() : E.MAN_DEAD.play(),
                                this.commitHistoryMutation()
                            }
                            ,
                            this.onFileSelected = event => {
                                let e = event && event.target;
                                if (e && e.files && e.files[0]) {
                                    let t = e.files[0]
                                      , i = new FileReader;
                                    i.onload = e => {
                                        try {
                                            let t = i.result;
                                            var a = new Uint8Array(t.slice(2));
                                            let o = pako.ungzip(a, {
                                                to: "string"
                                            })
                                              , s = JSON.parse(o)
                                              , n = d.createFromJson(s.data);
                                            this.importRoleDesignData(n);

                                            const r = restoreRoleEditorGroupsFromSnapshot(s.decoGroups || [], this.decoManager.items || [], new Map);
                                            this.decoGroupMap = r.map,
                                            r.maxNumericId >= this.groupIdCounter && (this.groupIdCounter = r.maxNumericId + 1),
                                            this.setState({
                                                decoGroups: r.groups
                                            }, (() => this.commitHistoryMutation()));
                                        } catch (err) {
                                            console.error("Error loading .twrole file:", err);
                                            window.GLT && window.GLT.components && window.GLT.components.showAlert("Error", "Failed to load .twrole file: " + err.message);
                                        }
                                    }
                                    ,
                                    i.readAsArrayBuffer(t)
                                }
                                try {
                                    e && (e.value = null)
                                } catch (e) {}
                            }
                            ,
                            this.btnMerge = () => {
                                this.mergeFileInputRef.current && this.mergeFileInputRef.current.click()
                            },
                            
                            this.onMergeFileSelected = (event) => {
                                var file = event && event.target && event.target.files && event.target.files[0];
                                if (file) {
                                    var reader = new FileReader();
                                    reader.onload = (e) => {
                                        try {
                                            var result = reader.result;
                                            var uint8Array = new Uint8Array(result.slice(2));
                                            var unzipped = pako.ungzip(uint8Array, {
                                                to: "string"
                                            });
                                            var json = JSON.parse(unzipped);
                                            var roleData = d.createFromJson(json.data);
                                    
                                            var config = roleData.customRoleConfig;
                                            if (config && config.decolist) {
                                                var newDecos = [];
                                                var originalIndexToDeco = [];
                                                var mergedGroups = null;
                                                var insertIndex = this.getCreateInsertIndex("mergeBatch", (() => this.decoManager && this.decoManager.items ? this.decoManager.items.length : 0));
                                                config.decolist.forEach((decoData, idx) => {
                                                    if (decoData.code !== y.HEAD_CODE) {
                                                        var newDeco = this.decoManager.addDeco(decoData.code, insertIndex, true);
                                                        newDeco && (newDeco.clip && (newDeco.clip.position.copyFrom(decoData.position),
                                                        newDeco.clip.scale.copyFrom(decoData.scale),
                                                        newDeco.clip.rotation = decoData.rotation),
                                                        insertIndex++,
                                                        newDecos.push(newDeco),
                                                        originalIndexToDeco[idx] = newDeco);
                                                        newDeco || (originalIndexToDeco[idx] = null);
                                                    } else {
                                                        originalIndexToDeco[idx] = null;
                                                    }
                                                });

                                                if (json.decoGroups && json.decoGroups.length) {
                                                    mergedGroups = (this.state.decoGroups || []).slice();
                                                    json.decoGroups.forEach(gData => {
                                                        var items = (gData.itemIndexes || []).map(i => originalIndexToDeco[i]).filter(Boolean);
                                                        if (items.length) {
                                                            var newGroup = {
                                                                id: 'm-' + (this.groupIdCounter++),
                                                                name: gData.name || '',
                                                                visible: typeof gData.visible === 'boolean' ? gData.visible : true,
                                                                collapsed: !!gData.collapsed,
                                                                items: items
                                                            };
                                                            mergedGroups.push(newGroup);
                                                            items.forEach(item => this.decoGroupMap.set(item, newGroup));
                                                        }
                                                    });
                                                }

                                                if (newDecos.length > 0) {
                                                    this.decoManager.selectDecos(newDecos);
                                                    this.setState({
                                                        decos: this.decoManager.items,
                                                        decoGroups: mergedGroups || this.state.decoGroups
                                                    });
                                                    this.refreshEditValues();
                                                    this.commitHistoryMutation();
                                                } else if (mergedGroups) {
                                                    this.setState({
                                                        decoGroups: mergedGroups
                                                    }, (() => this.commitHistoryMutation()));
                                                }
                                            }
                                        } catch (err) {
                                            console.error("Error merging .twrole file:", err);
                                            window.GLT && window.GLT.components && window.GLT.components.showAlert("Error", "Failed to merge .twrole file: " + err.message);
                                        }
                                    },
                                    reader.readAsArrayBuffer(file)
                                }
                                try {
                                    if (event && event.target) event.target.value = null;
                                } catch (ex) {}
                                if (this.mergeFileInputRef && this.mergeFileInputRef.current) this.mergeFileInputRef.current.value = null;
                            },
                            this.btnImport = () => {
                                this.fileInputRef.current && this.fileInputRef.current.click()
                            }
                            ,
                            this.btnDownload = () => {
                                this.closeSaveMore(),
                                this.decoManager.selectDecos([]);
                                let e = this.exportConfig()
                                  , t = new d(l.getDefault(this.state.selectedCamp, this.state.selectedGender.female));
                                t.customRoleConfig = e;
                                let i = this.actorClip.getBounds();
                                this.exportThumb().then((e => {
                                    let a = JSON.stringify({
                                        data: t.exportSyncJson(),
                                        hash: MD5.hash(e),
                                        thumb: {
                                            dataUrl: e,
                                            pivot: {
                                                x: -i.left,
                                                y: -i.top
                                            }
                                        },
                                        decoGroups: createRoleEditorGroupSnapshot(this.state.decoGroups || [], this.state.decos || [], "itemIndexes")
                                    })
                                      , o = pako.gzip(a, { level: 1 })
                                      , s = new Uint8Array([0, 1])
                                      , n = new Blob([s.buffer, o],{
                                        type: "application/octet-stream"
                                    });
                                    m.downloadBlob(n, "role.twrole")
                                }
                                ))
                            }
                            ,
                            this.getDecoLayerNumber = e => {
                                if (!this.decoManager || !e || !e.code)
                                    return null;
                                const t = this.decoManager.items || []
                                  , a = this._renderDecoIndexMap
                                  , i = a && a.has(e) ? a.get(e) : t.indexOf(e);
                                return i < 0 ? null : t.length - i
                            }
                            ,
                            this.btnDownloadAllImages = () => {
                                X(this, void 0, void 0, (function*() {
                                    // 1. 動態載入 JSZip
                                    if (typeof JSZip === 'undefined') {
                                        yield new Promise((resolve, reject) => {
                                            const script = document.createElement('script');
                                            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                                            script.onload = resolve;
                                            script.onerror = reject;
                                            document.head.appendChild(script);
                                        });
                                    }

                                    const zip = new JSZip();
                                    const imgFolder = zip.folder("role_images");
                                    e.GLT.components.showLoading("Preparing ZIP... (0%)");

                                    let total = 0;
                                    for (const cat of L) {
                                        if (!cat.options) yield cat.prepareOptions();
                                        total += cat.options.length;
                                    }

                                    let count = 0;
                                    for (const cat of L) {
                                        const catFolder = imgFolder.folder(cat.code);
                                        for (const opt of cat.options) {
                                            // 將 DataURL 轉換為 Blob 並加入 ZIP
                                            const response = yield fetch(opt.dataUrl);
                                            const blob = yield response.blob();
                                            catFolder.file(`${opt.code}.png`, blob);
                                            
                                            count++;
                                            if (count % 10 === 0) {
                                                e.GLT.components.showLoading(`Preparing ZIP... (${Math.floor(count/total*100)}%)`);
                                            }
                                        }
                                    }

                                    e.GLT.components.showLoading("Generating ZIP file...");
                                    const content = yield zip.generateAsync({type: "blob"});
                                    const link = document.createElement('a');
                                    link.href = URL.createObjectURL(content);
                                    link.download = "tw_role_images.zip";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    e.GLT.components.hideLoading();
                  }))
                            }
                            ,
                            this.commitDecoOrder = (newDecos, newDecoGroups = null, options = {}) => {
                                const {
                                    setSettling = !1,
                                    restoreDomItem = null,
                                    resolveRestoreContainer = null,
                                    fallbackRestoreContainer = null,
                                    pushHistory = !0
                                } = options;
                                setSettling && (this.isSettling = !0);
                                const groupBuckets = new Map;
                                newDecos.forEach((item => {
                                    const group = this.decoGroupMap.get(item);
                                    group && (groupBuckets.has(group) || groupBuckets.set(group, []),
                                    groupBuckets.get(group).push(item))
                                }
                                ));
                                const updatedGroups = (null != newDecoGroups ? [...newDecoGroups] : [...(this.state.decoGroups || [])]).map((group => {
                                    return group.items = groupBuckets.get(group) || [],
                                    group
                                }
                                ));
                                this.decoManager.items = newDecos,
                                newDecos.forEach(((item, index) => {
                                    item.clip && item.clip.parent === this.decoManager.root && this.decoManager.root.setChildIndex(item.clip, index)
                                }
                                ));
                                try {
                                    if (restoreDomItem) {
                                        restoreDomItem.style.display = "none";
                                        const restoreContainer = resolveRestoreContainer ? resolveRestoreContainer() : fallbackRestoreContainer;
                                        restoreContainer && restoreContainer.isConnected && restoreDomItem.parentNode !== restoreContainer && restoreContainer.appendChild(restoreDomItem)
                                    }
                                } catch (err) {
                                    console.warn("Manual DOM fixup error:", err)
                                }
                                this.decoManager.emit("decolist", newDecos);
                                const container = this.editListRef.current
                                  , savedScrollTop = container ? container.scrollTop : 0;
                                this.setTrackedTimeout((() => {
                                    if (this._unmounted)
                                        return;
                                    this.setState({
                                        decos: newDecos,
                                        decoGroups: updatedGroups,
                                        layoutVersion: (this.state.layoutVersion || 0) + 1,
                                        scrollTop: savedScrollTop
                                    }, (() => {
                                        pushHistory && this.commitHistoryMutation(),
                                        requestAnimationFrame((() => {
                                            this.editListRef.current && (this.editListRef.current.scrollTop = savedScrollTop),
                                            this.setTrackedTimeout((() => {
                                                this.isSettling = !1
                                            }
                                            ), 100)
                                        }
                                        ))
                                    }
                                    ))
                                }
                                ), 0)
                            }
                            ,
                            this.moveSelectedDecosToBoundary = e => {
                                if ("top" !== e && "bottom" !== e)
                                    return;
                                const t = this.decoManager && this.decoManager.items ? this.decoManager.items.slice() : []
                                  , i = (this.state.selectedDecos || []).filter((e => e && !e.isHead() && t.includes(e)));
                                if (!t.length || !i.length)
                                    return;
                                const a = new Set;
                                i.forEach((e => {
                                    const i = this.decoGroupMap.get(e);
                                    i && i.items && i.items.length ? i.items.forEach((e => {
                                        e && !e.isHead() && t.includes(e) && a.add(e)
                                    }
                                    )) : a.add(e)
                                }
                                ));
                                const o = t.filter((e => a.has(e)));
                                if (!o.length)
                                    return;
                                const r = t.filter((e => !a.has(e)))
                                  , s = "bottom" === e ? [...o, ...r] : [...r, ...o];
                                s.length === t.length && s.every(((e, i) => e === t[i])) || this.commitDecoOrder(s, null, {
                                    setSettling: !0
                                })
                            }
                            ,
                            this.onSortEnd = (evt) => {
                                if (!evt || !evt.item) {
                                    this.isSettling = !1;
                                    return;
                                }
                                const cancelSort = () => {
                                    this.isSettling = !1,
                                    this.localDragState = null,
                                    this.topSpacerSafe = true
                                };
                                const isGroupDrag = evt.item.classList.contains('groupRow');
                                this.isSettling = true;
                                let resolveRestoreContainer = null;
                                
                                let newDecos = [...this.state.decos];
                                let newDecoGroups = [...(this.state.decoGroups || [])];

                                if (isGroupDrag) {
                                    // --- Group Reordering ---
                                    const groupId = evt.item.getAttribute("data-id");
                                    const draggedGroup = newDecoGroups.find(g => String(g.id) === String(groupId));
                                    
                                    if (draggedGroup) {
                                        // 1. Temporarily remove group items from decos (maintaining relative order)
                                        const groupItems = newDecos.filter(d => this.decoGroupMap.get(d) === draggedGroup);
                                        newDecos = newDecos.filter(d => this.decoGroupMap.get(d) !== draggedGroup);
                                        
                                        // 2. Remove Group from Group List
                                        const oldGroupIndex = newDecoGroups.indexOf(draggedGroup);
                                        if (oldGroupIndex > -1) newDecoGroups.splice(oldGroupIndex, 1);

                                        // 3. Determine Insertion Points
                                        const nextSibling = evt.item.nextElementSibling;
                                        let insertIndexDecos = 0; // Default: Bottom (Index 0)
                                        let insertIndexGroups = newDecoGroups.length; // Default: Bottom (End of Array)

                                        if (nextSibling) {
                                            // Case A: Dropped before another Group
                                            if (nextSibling.classList.contains('groupRow')) {
                                                const nextGroupId = nextSibling.getAttribute('data-id');
                                                // Group List Insertion (Visual Top-to-Bottom)
                                                const idx = newDecoGroups.findIndex(g => String(g.id) === String(nextGroupId));
                                                if (idx > -1) insertIndexGroups = idx;
                                                
                                                // Decos List Insertion (Z-Order / High Index = Top)
                                                // We want to be visually ABOVE the next group.
                                                // So our indices must be HIGHER than the next group's items.
                                                const nextGroup = (this.state.decoGroups || []).find(g => String(g.id) === String(nextGroupId));
                                                if (nextGroup) {
                                                    const nextGroupItems = newDecos.filter(d => this.decoGroupMap.get(d) === nextGroup);
                                                    if (nextGroupItems.length > 0) {
                                                        // Highest index item in Z-Order is visually topmost of that group
                                                        const maxItem = nextGroupItems[nextGroupItems.length - 1]; // items are sorted in newDecos
                                                        const maxItemIndex = newDecos.indexOf(maxItem);
                                                        if (maxItemIndex > -1) insertIndexDecos = maxItemIndex + 1;
                                                    }
                                                }
                                            } 
                                            // Case B: Dropped before an Item (shouldn't happen if dragging groups usually, but possible mixed list)
                                            else if (nextSibling.classList.contains('dragBlock')) {
                                                const idxAttr = nextSibling.getAttribute('data-index');
                                                if (idxAttr) {
                                                    const idx = parseInt(idxAttr);
                                                    const item = this.state.decos[idx];
                                                    const currentIdx = newDecos.indexOf(item);
                                                    if (currentIdx > -1) insertIndexDecos = currentIdx + 1;
                                                }
                                            }
                                        } else {
                                            // Dropped at bottom of list
                                            // insertIndexDecos = 0; (Already set)
                                            // insertIndexGroups = length; (Already set)
                                        }

                                        // 4. Re-insert
                                        if (groupItems.length > 0) {
                                            newDecos.splice(insertIndexDecos, 0, ...groupItems);
                                        }
                                        newDecoGroups.splice(insertIndexGroups, 0, draggedGroup);
                                    } else {
                                        return cancelSort();
                                    }
                                } else {
                                    // --- Item Reordering (Standard) ---
                                    const draggedItemIndex = parseInt(evt.item.getAttribute("data-index"), 10);
                                    if (isNaN(draggedItemIndex)) return cancelSort();
                                    
                                    const draggedItem = this.state.decos[draggedItemIndex];
                                    if (!draggedItem) return cancelSort();

                                    const oldIndex = newDecos.indexOf(draggedItem);
                                    if (oldIndex > -1) newDecos.splice(oldIndex, 1);
                                    const oldGroup = this.decoGroupMap.get(draggedItem) || null;

                                    const listRoot = this.editListRef.current;
                                    const isMeaningfulNode = (node) => node && node.classList && (node.classList.contains('dragBlock') || node.classList.contains('groupRow'));
                                    const findNextMeaningful = (node) => {
                                        let cur = node;
                                        while (cur && !isMeaningfulNode(cur)) cur = cur.nextElementSibling;
                                        return cur;
                                    };
                                    const findPrevMeaningful = (node) => {
                                        let cur = node;
                                        while (cur && !isMeaningfulNode(cur)) cur = cur.previousElementSibling;
                                        return cur;
                                    };
                                    const getGroupById = (groupId) => newDecoGroups.find(g => String(g.id) === String(groupId)) || null;
                                    const resolveGroupItemsContainer = (group) => {
                                        if (!listRoot || !group) return null;
                                        const groupRow = listRoot.querySelector(`.groupRow[data-id="${group.id}"]`);
                                        if (!groupRow) return null;
                                        return groupRow.querySelector('.groupItems');
                                    };
                                    const getItemByNode = (node) => {
                                        if (!node || !node.classList || !node.classList.contains('dragBlock')) return null;
                                        const idxAttr = node.getAttribute('data-index');
                                        if (idxAttr === null || idxAttr === undefined) return null;
                                        const idx = parseInt(idxAttr, 10);
                                        return isNaN(idx) ? null : this.state.decos[idx] || null;
                                    };
                                    const getGroupItemsInDecos = (group) => {
                                        if (!group) return [];
                                        return newDecos.filter(d => d !== draggedItem && this.decoGroupMap.get(d) === group);
                                    };

                                    let getInsertByNextNode;
                                    let getInsertByPrevNode;
                                    const getInsertBeforeGroup = (group, groupNode) => {
                                        if (!group) return -1;
                                        const groupItems = getGroupItemsInDecos(group);
                                        if (groupItems.length > 0) {
                                            const topItemIndex = newDecos.indexOf(groupItems[groupItems.length - 1]);
                                            if (topItemIndex > -1) return topItemIndex + 1;
                                        }
                                        const fallbackNext = groupNode ? findNextMeaningful(groupNode.nextElementSibling) : null;
                                        if (fallbackNext) return getInsertByNextNode(fallbackNext);
                                        return 0;
                                    };
                                    const getInsertAfterGroup = (group, groupNode) => {
                                        if (!group) return -1;
                                        const groupItems = getGroupItemsInDecos(group);
                                        if (groupItems.length > 0) {
                                            const bottomItemIndex = newDecos.indexOf(groupItems[0]);
                                            if (bottomItemIndex > -1) return bottomItemIndex;
                                        }
                                        const fallbackPrev = groupNode ? findPrevMeaningful(groupNode.previousElementSibling) : null;
                                        if (fallbackPrev) return getInsertByPrevNode(fallbackPrev);
                                        return newDecos.length;
                                    };
                                    getInsertByNextNode = (node) => {
                                        if (!node) return -1;
                                        if (node.classList.contains('dragBlock')) {
                                            const siblingItem = getItemByNode(node);
                                            const siblingCurrentIndex = siblingItem ? newDecos.indexOf(siblingItem) : -1;
                                            return siblingCurrentIndex > -1 ? siblingCurrentIndex + 1 : -1;
                                        }
                                        if (node.classList.contains('groupRow')) {
                                            const group = getGroupById(node.getAttribute('data-id'));
                                            return getInsertBeforeGroup(group, node);
                                        }
                                        return -1;
                                    };
                                    getInsertByPrevNode = (node) => {
                                        if (!node) return -1;
                                        if (node.classList.contains('dragBlock')) {
                                            const siblingItem = getItemByNode(node);
                                            const siblingCurrentIndex = siblingItem ? newDecos.indexOf(siblingItem) : -1;
                                            return siblingCurrentIndex > -1 ? siblingCurrentIndex : -1;
                                        }
                                        if (node.classList.contains('groupRow')) {
                                            const group = getGroupById(node.getAttribute('data-id'));
                                            return getInsertAfterGroup(group, node);
                                        }
                                        return -1;
                                    };

                                    const targetContainer = evt.to || (evt.item ? evt.item.parentElement : null);
                                    const targetGroupRow = targetContainer && targetContainer.closest ? targetContainer.closest('.groupRow') : null;
                                    let targetGroup = null;
                                    if (targetGroupRow && targetContainer !== listRoot) {
                                        targetGroup = getGroupById(targetGroupRow.getAttribute('data-id'));
                                    }

                                    if (targetGroup) {
                                        this.decoGroupMap.set(draggedItem, targetGroup);
                                    } else {
                                        this.decoGroupMap.delete(draggedItem);
                                    }

                                    let nextSibling = findNextMeaningful(evt.item.nextElementSibling);
                                    let prevSibling = findPrevMeaningful(evt.item.previousElementSibling);

                                    // Empty group container has no dragBlock siblings; use its row neighbors as anchors.
                                    if (targetGroup && !nextSibling && !prevSibling && targetGroupRow) {
                                        nextSibling = findNextMeaningful(targetGroupRow.nextElementSibling);
                                        prevSibling = findPrevMeaningful(targetGroupRow.previousElementSibling);
                                    }

                                    let insertIndex = getInsertByNextNode(nextSibling);
                                    if (insertIndex === -1) insertIndex = getInsertByPrevNode(prevSibling);
                                    if (insertIndex === -1 && targetGroup && targetGroupRow) {
                                        insertIndex = getInsertBeforeGroup(targetGroup, targetGroupRow);
                                    }
                                    if (insertIndex === -1) {
                                        insertIndex = targetContainer === listRoot ? 0 : newDecos.length;
                                    }

                                    newDecos.splice(insertIndex, 0, draggedItem);
                                    resolveRestoreContainer = () => {
                                        const expectedSourceContainer = oldGroup
                                            ? resolveGroupItemsContainer(oldGroup)
                                            : listRoot;
                                        if (expectedSourceContainer && expectedSourceContainer.isConnected) {
                                            return expectedSourceContainer;
                                        }
                                        return (evt.from && evt.from.isConnected) ? evt.from : null;
                                    };
                                }
                                this.commitDecoOrder(newDecos, newDecoGroups, {
                                    restoreDomItem: evt.item,
                                    resolveRestoreContainer: resolveRestoreContainer,
                                    fallbackRestoreContainer: evt.from && evt.from.isConnected ? evt.from : null
                                });
                            }
                            ,
                            this.getDecoKey = (e) => {
                                if (!this.decoKeys) this.decoKeys = new WeakMap();
                                if (!this.uniqueKeyCounter) this.uniqueKeyCounter = 0;
                                if (!this.decoKeys.has(e)) {
                                    this.decoKeys.set(e, "deco_" + (++this.uniqueKeyCounter));
                                }
                                return this.decoKeys.get(e);
                            },
                            this.renderDragBlock = (e, t, isGrouped = false) => {
                                let i = ["dragBlock"];
                                const r = this._renderDraggingSet || new Set((this.state.draggingDecos && this.state.draggingDecos.length ? this.state.draggingDecos : this.currentDraggingDecos) || []);
                                r.has(e) && i.push("dragging"),
                                this.insertItem == e && i.push("inserting");
                                const selectedSet = this._renderSelectedSet
                                  , a = selectedSet ? selectedSet.has(e) : (this.state.selectedDecos || []).includes(e)
                                  , o = this.decoManager.decoController
                                  , s = !a && !e.isHead() && o && !o.hasHead();
                                const n = this.getDecoLayerNumber(e);
                                return React.createElement(MaterialUI.Tooltip, {
                                    title: s ? c("roleEditor.allowMultiSelect") : "",
                                    placement: "left"
                                }, React.createElement("div", {
                                    key: this.getDecoKey(e) + (this.state.layoutVersion ? "_" + this.state.layoutVersion : ""),
                                    "data-index": t,
                                    className: i.join(" "),
                                    "data-key": this.getDecoKey(e),
                                    style: isGrouped ? { marginLeft: "20px", borderLeft: "2px solid #666", paddingLeft: "4px" } : {},
                                }, this.renderDeleteBtn(e, t), n ? React.createElement("div", {
                                    className: "layerBadge"
                                }, n) : null, React.createElement("div", {
                                    className: "choiceBlock button " + (a ? "selected" : ""),
                                    onClick: t => this.onBtnSelected(t, e)
                                }, React.createElement("img", {
                                    src: V(this.decoManager, e),
                                    draggable: "false"
                                }))))
                            }
                            ,
                            this.renderGroupPanel = () => null
                            ,
                            this.toggleGroupCollapse = e => {
                                if (!e)
                                    return;
                                const t = (this.state.decoGroups || []).map((i => i === e ? Object.assign({}, i, {
                                    collapsed: !i.collapsed
                                }) : i));
                                t.forEach((e => (e.items || []).forEach((t => t && this.decoGroupMap.set(t, e))))),
                                this.setState({
                                    decoGroups: t
                                }, (() => this.commitHistoryMutation()))
                            }
                            ,
                            this.createDecoGroup = (selectedItems) => {
                                if (!selectedItems || !selectedItems.length) return;
                                const groupIdx = (this.state.decoGroups || []).length + 1;
                                const allDecos = this.state.decos || [];
                                const items = sortRoleEditorDecosByLayer(getRoleEditorSelectableDecos(selectedItems, this.decoGroupMap), allDecos);
                                if (!items.length) return;
                                const newGroup = {
                                    id: "group_" + Date.now(),
                                    name: "Group " + groupIdx,
                                    items: items,
                                    visible: true,
                                    collapsed: false
                                };
                                const newGroups = [...(this.state.decoGroups || []), newGroup];
                                items.forEach(item => {
                                    this.decoGroupMap.set(item, newGroup);
                                });
                                this.setState({ decoGroups: newGroups }, () => this.commitHistoryMutation());
                            }
                            ,
                            this.onRenameGroupStart = (group) => {
                                this.setState({
                                    renamingGroupId: group.id,
                                    renamingGroupName: group.name || "Group"
                                });
                            }
                            ,
                            this.onRenameGroupChange = (e) => {
                                this.setState({ renamingGroupName: e.target.value });
                            }
                            ,
                            this.onRenameGroupEnd = () => {
                                const { renamingGroupId, renamingGroupName, decoGroups } = this.state;
                                if (renamingGroupId) {
                                    const groups = (decoGroups || []).map(g => g.id === renamingGroupId ? Object.assign({}, g, {
                                        name: renamingGroupName
                                    }) : g);
                                    groups.forEach(g => (g.items || []).forEach(item => this.decoGroupMap.set(item, g)));
                                    this.setState({
                                        renamingGroupId: null,
                                        renamingGroupName: "",
                                        decoGroups: groups
                                    }, () => this.commitHistoryMutation());
                                }
                            }
                            ,
                            this.onRenameGroupKeyDown = (e) => {
                                if (e.key === 'Enter') {
                                    this.onRenameGroupEnd();
                                } else if (e.key === 'Escape') {
                                    this.setState({ renamingGroupId: null, renamingGroupName: "" });
                                }
                            }
                            ,
                            this.selectGroupItems = (group) => {
                                if (group && group.items && group.items.length) {
                                    this.decoManager.selectDecos(group.items);
                                    this.refreshEditValues();
                                }
                            }
                            ,
                            this.removeDecoFromGroup = (deco) => {
                                if (!this.decoGroupMap.has(deco)) return;
                                const group = this.decoGroupMap.get(deco);
                                this.decoGroupMap.delete(deco);
                                const newGroups = (this.state.decoGroups || []).map(g => {
                                    if (g !== group) return g;
                                    return Object.assign({}, g, {
                                        items: (g.items || []).filter(i => i !== deco)
                                    });
                                }).filter(g => (g.items || []).length);
                                newGroups.forEach(g => (g.items || []).forEach(item => this.decoGroupMap.set(item, g)));
                                this.setState({ decoGroups: newGroups }, () => this.commitHistoryMutation());
                            }
                            ,
                            this.initGroupSortable = (el, group) => {
                                const key = group && String(group.id);
                                if (el) {
                                    if (!key || this.groupSortables.has(key)) return;
                                    const s = new Sortable(el, {
                                        group: 'decos',
                                        draggable: ".dragBlock",
                                        animation: this.getSortableAnimation(),
                                        onEnd: (evt) => this.onSortEnd(evt),
                                        onMove: (evt) => {
                                            // Prevent groups from being dragged into other groups
                                            if (evt.dragged && evt.dragged.classList.contains('groupRow')) {
                                                return false;
                                            }
                                            return true; // Allow items
                                        }
                                    });
                                    this.groupSortables.set(key, s);
                                } else if (key) {
                                    const s = this.groupSortables.get(key);
                                    if (s) {
                                        s.destroy();
                                        this.groupSortables.delete(key);
                                    }
                                }
                            }
                            ,
                            this.renderGroupRow = (group, currentY = 0, renderStart = 0, renderEnd = 100000, decoIndexMap = null) => {
                                const groupItems = group.items || [];
                                const renderedItems = [];
                                const allDecos = this.state.decos || [];
                                
                                const ITEM_HEIGHT = 54;
                                const GROUP_HEADER_HEIGHT = 44; // Sync with renderLayerList
                                let itemCurrentY = currentY + GROUP_HEADER_HEIGHT;
                                
                                let paddingTop = 0;
                                let paddingBottom = 0;

                                // Render items in reverse order (Top to Bottom visual)
                                for (let i = groupItems.length - 1; i >= 0; i--) {
                                    const item = groupItems[i];
                                    const globalIndex = decoIndexMap ? decoIndexMap.has(item) ? decoIndexMap.get(item) : -1 : allDecos.indexOf(item);
                                    
                                    if (!group.collapsed) {
                                        if (!isRoleEditorVirtualRowVisible(itemCurrentY, ITEM_HEIGHT, renderStart, renderEnd, false)) {
                                            itemCurrentY + ITEM_HEIGHT <= renderStart ? paddingTop += ITEM_HEIGHT : paddingBottom += ITEM_HEIGHT;
                                        } else if (globalIndex !== -1) {
                                            renderedItems.push(this.renderDragBlock(item, globalIndex, true));
                                        }
                                        itemCurrentY += ITEM_HEIGHT;
                                    }
                                }
                                
                                const spacerStyle = { 
                                    width: "100%", 
                                    display: "block", 
                                    flexShrink: 0,
                                    pointerEvents: "none",
                                    boxSizing: "border-box"
                                };

                                if (paddingTop > 0) {
                                    renderedItems.unshift(React.createElement("div", { 
                                        key: "pad-top", 
                                        style: { ...spacerStyle, height: paddingTop + "px", minHeight: paddingTop + "px" }, 
                                        className: "spacerBlock" 
                                    }));
                                }
                                if (paddingBottom > 0) {
                                    renderedItems.push(React.createElement("div", { 
                                        key: "pad-bottom", 
                                        style: { ...spacerStyle, height: paddingBottom + "px", minHeight: paddingBottom + "px" }, 
                                        className: "spacerBlock" 
                                    }));
                                }
                                
                                return React.createElement("div", {
                                    className: "groupRow",
                                    key: group.id + (this.state.layoutVersion ? "_" + this.state.layoutVersion : ""),
                                    "data-id": group.id,
                                    style: { border: "1px solid #444", margin: "2px", background: "#2a2a2a" }
                                }, 
                                    React.createElement("div", { 
                                        className: "groupHeader",
                                        style: { display: "flex", alignItems: "center", padding: "5px", cursor: "pointer", background: "#333" },
                                        onClick: () => this.selectGroupItems(group)
                                    },
                                        React.createElement("span", { 
                                            onClick: (e) => { e.stopPropagation(); this.toggleGroupCollapse(group); },
                                            style: { marginRight: "10px", width: "20px", textAlign: "center" }
                                        }, group.collapsed ? "+" : "-"),
                                        
                                        this.state.renamingGroupId === group.id ?
                                            React.createElement("input", {
                                                value: this.state.renamingGroupName,
                                                autoFocus: true,
                                                onClick: (e) => e.stopPropagation(),
                                                onChange: this.onRenameGroupChange,
                                                onBlur: this.onRenameGroupEnd,
                                                onKeyDown: this.onRenameGroupKeyDown,
                                                style: { background: "#fff", color: "#000", border: "none", padding: "2px" }
                                            }) :
                                            React.createElement("span", {
                                                onDoubleClick: (e) => { e.stopPropagation(); this.onRenameGroupStart(group); },
                                                style: { userSelect: "none" }
                                            }, group.name || "Group"),

                                        React.createElement("div", { style: { flex: 1} }),

                                        React.createElement(MaterialUI.Tooltip, { title: "Ungroup" },
                                            React.createElement(MaterialUI.IconButton, {
                                                style: { padding: 5, color: "#aaa", marginRight: 5 },
                                                onClick: (e) => { e.stopPropagation(); this.ungroupDecoGroup(group); }
                                            }, React.createElement(MaterialUI.Icon, { style: { fontSize: 20 } }, "link_off"))
                                        ),

                                        React.createElement(MaterialUI.Checkbox, {
                                            checked: group.visible !== !1,
                                            style: { padding: 0 },
                                            onClick: (e) => e.stopPropagation(),
                                            onChange: (e) => {
                                                e.stopPropagation && e.stopPropagation();
                                                this.setGroupVisibility(group, e.target.checked);
                                            }
                                        })
                                    ),
                                    !group.collapsed && React.createElement("div", {
                                        className: "groupItems",
                                        ref: (el) => this.initGroupSortable(el, group),
                                        style: { minHeight: '30px', paddingLeft: '15px', paddingBottom: '5px' }
                                    }, renderedItems)
                                );
                            }
                            ,
                            this.renderLayerList = () => {
                                const allDecos = this.state.decos || [];
                                const groups = this.state.decoGroups || [];
                                const decoIndexMap = new Map(allDecos.map(((item, index) => [item, index])));
                                const groupItemSetMap = new Map(groups.map((group => [group, new Set(group.items || [])])));
                                const renderedGroups = new Set();
                                const nodes = [];
                                this._renderDecoIndexMap = decoIndexMap,
                                this._renderSelectedSet = new Set(this.state.selectedDecos || []),
                                this._renderDraggingSet = new Set((this.state.draggingDecos && this.state.draggingDecos.length ? this.state.draggingDecos : this.currentDraggingDecos) || []);
                                
                                // --- Virtualization Logic ---
                                const scrollTop = this.state.scrollTop || 0;
                                
                                const isDragging = !!this.localDragState;
                                const isSettling = this.isSettling;
                                
                                // FIX: Disable top spacer during drag, settling, and briefly after
                                // topSpacerSafe becomes true only after user scrolls smoothly post-drop
                                const useTopSpacer = this.topSpacerSafe && !isDragging && !isSettling;
                                
                                const viewportHeight = 2500; 
                                const buffer = 2000;
                                const maxRenderRange = 10000; // Max pixels to render above viewport
                                
                                // When topSpacerSafe is false, still use a limited range instead of 0
                                // This prevents DOM from growing too large while avoiding jump issues
                                const renderRange = getRoleEditorLayerRenderRange(scrollTop, viewportHeight, buffer, maxRenderRange, useTopSpacer);
                                const renderStart = renderRange.start;
                                const renderEnd = renderRange.end;

                                // IMPORTANT: These must match CSS exactly (height + padding + border + margin)
                                const ITEM_HEIGHT = 54; 
                                const GROUP_HEADER_HEIGHT = 44; 

                                let currentY = 0;
                                let topSpacerHeight = 0;
                                let bottomSpacerHeight = 0;
                                
                                // Forced Drag Logic is no longer strictly needed if we render from 0,
                                // but we keep it to ensure the dragged item is rendered if it's somehow BELOW viewport (shouldn't happen with Sortable scroll).
                                const forcedDragIndex = this.localDragState && !this.localDragState.isGroup ? parseInt(this.localDragState.itemIndex) : -1;
                                const forcedDragGroupId = this.localDragState && this.localDragState.isGroup ? this.localDragState.groupId : null;
                                
                                let pendingSpacerHeight = 0;
                                
                                const spacerStyle = { 
                                    width: "100%", 
                                    display: "block", 
                                    flexShrink: 0,
                                    pointerEvents: "none",
                                    boxSizing: "border-box"
                                };
                                
                                const pushPendingSpacer = () => {
                                    if (pendingSpacerHeight > 0) {
                                        nodes.push(React.createElement("div", { 
                                            key: "spacer-" + nodes.length, 
                                            style: { ...spacerStyle, height: pendingSpacerHeight + "px", minHeight: pendingSpacerHeight + "px" }, 
                                            className: "spacerBlock" 
                                        }));
                                        pendingSpacerHeight = 0;
                                    }
                                };

                                for (let i = allDecos.length - 1; i >= 0; i--) {
                                    const item = allDecos[i];
                                    const group = this.decoGroupMap.get(item);
                                    
                                    if (group) {
                                        if (!renderedGroups.has(group)) {
                                            renderedGroups.add(group);
                                            // Calculate Group Height
                                            let groupHeight = GROUP_HEADER_HEIGHT;
                                            if (!group.collapsed) {
                                                groupHeight += (group.items.length * ITEM_HEIGHT);
                                            }

                                            const isForcedGroup = (forcedDragGroupId === group.id);
                                            const groupItemSet = groupItemSetMap.get(group);
                                            const containsForcedItem = (forcedDragIndex !== -1 && groupItemSet && groupItemSet.has(allDecos[forcedDragIndex]));
                                            
                                            // Determine visibility - Note currentY increases (Top down)
                                            // Visible intersection: (CurrentY < RenderEnd) AND (CurrentY + Height > RenderStart)
                                            const isVisible = isRoleEditorVirtualRowVisible(currentY, groupHeight, renderStart, renderEnd, isForcedGroup || containsForcedItem);

                                            if (isVisible) {
                                                pushPendingSpacer();
                                                
                                                let gStart = renderStart;
                                                let gEnd = renderEnd;
                                                
                                                if (containsForcedItem) {
                                                    gStart = -1;
                                                    gEnd = Number.MAX_SAFE_INTEGER;
                                                }
                                                
                                                nodes.push(this.renderGroupRow(group, currentY, gStart, gEnd, decoIndexMap));
                                            } else {
                                                pendingSpacerHeight += groupHeight;
                                            }
                                            currentY += groupHeight;
                                        }
                                    } else {
                                        // Standalone Item
                                        const isForcedItem = (i === forcedDragIndex);
                                        const isVisible = isRoleEditorVirtualRowVisible(currentY, ITEM_HEIGHT, renderStart, renderEnd, isForcedItem);

                                        if (isVisible) {
                                            pushPendingSpacer();
                                            nodes.push(this.renderDragBlock(item, i, false));
                                        } else {
                                            pendingSpacerHeight += ITEM_HEIGHT;
                                        }
                                        currentY += ITEM_HEIGHT;
                                    }
                                }
                                
                                // Render empty groups
                                groups.forEach(group => {
                                    if (!renderedGroups.has(group)) {
                                        const groupHeight = GROUP_HEADER_HEIGHT; 
                                        const isForcedGroup = (forcedDragGroupId === group.id);
                                        const isVisible = isRoleEditorVirtualRowVisible(currentY, groupHeight, renderStart, renderEnd, isForcedGroup);
                                        
                                        if (isVisible) {
                                            pushPendingSpacer();
                                            nodes.push(this.renderGroupRow(group, currentY, renderStart, renderEnd, decoIndexMap));
                                        } else {
                                            pendingSpacerHeight += groupHeight;
                                        }
                                        currentY += groupHeight;
                                    }
                                });
                                
                                pushPendingSpacer();

                                // Force block display to prevent flex collapse
                                // const spacerStyle... (already defined above)
                                
                                this._virtualTotalHeight = currentY; 
                                
                                return nodes;
                            }
                            ,
                            this.renderDeleteBtn = (e, t) => {
                                if (!e.isHead())
                                    return React.createElement(MaterialUI.IconButton, {
                                        className: "delete",
                                        onClick: this.removeDeco.bind(this, e)
                                    }, React.createElement(MaterialUI.Icon, null, "clear"))
                            }
                            ,
                            this.btnSave = () => {
                                this.closeSaveMore(),
                                this.isLocked() ? this.alertAndPurchaseUnlockSlotItem().then(( () => this.refreshSlotLock())).then(( () => {
                                    this.isLocked() || this.btnSave()
                                }
                                )) : this.props.emitter.emit("saveRole", this.exportRoleDesignData())
                            }
                            ,
                            this.btnSaveMore = e => {
                                this.setState({
                                    saveMoreAnchor: e.currentTarget
                                })
                            }
                            ,
                            this.closeSaveMore = () => {
                                this.setState({
                                    saveMoreAnchor: null
                                })
                            }
                            ,
                            this.btnActorFacing = () => {
                                let e = (Math.round(this.state.facing / 90) + 1) % 4 * 90;
                                this.setState({
                                    facing: e
                                }),
                                this.actorClip.rotationDeg = e
                            }
                            ,
                            this.btnInputBoxRotate = () => {
                                let e = this.state.editValues.rotate;
                                this.setState({
                                    rotateInputBox: {
                                        key: "rotate",
                                        value: e,
                                        min: -180,
                                        max: 180,
                                        step: x.DecoConstant.ROTATE_STEP
                                    }
                                })
                            }
                            ,
                            this.btnInputBoxRatio = () => {
                                let e = Math.abs(this.state.editValues.scaleY / this.state.editValues.scaleX);
                                this.setState({
                                    ratioInputBox: {
                                        key: "ratio",
                                        value: e,
                                        min: x.DecoConstant.SCALE_RATIO_MIN,
                                        max: x.DecoConstant.SCALE_RATIO_MAX,
                                        step: x.DecoConstant.SCALE_RATIO_STEP
                                    }
                                })
                            }
                            ,
                            this.btnInputBoxScale = () => {
                                const e = this.decoManager.decoController;
                                let t = Math.abs(this.state.editValues.scaleX);
                                this.setState({
                                    scaleInputBox: {
                                        key: "scale",
                                        value: t,
                                        min: e ? e.scaleRange.min : .001,
                                        max: e ? e.scaleRange.max : 1,
                                        step: x.DecoConstant.SCALE_STEP
                                    }
                                })
                            }
                            ,
                            this.handleClose = () => {
                                e.React.unmountRootComponent(_),
                                _ = null,
                                G = null
                            };
                            this.insertPrefsStorageKey = "TWRoleCgEditor.insertPrefs";
                            const insertPrefs = this.loadInsertPrefs();
                            G = this,
                            this.decoGroupMap = new Map(),
                            this.groupSortables = new Map(),
                            this.decoManager = new p.DecoManager(this,this.actorClip),
                            this.topSpacerSafe = true,
                            this.state = Object.assign({
                                currTab: L[0],
                                scrollTop: 0,
                                stageScale: this.calcStageScale(),
                                ingame: this.props.ingame,
                                facing: 0,
                                draggingDecos: [],
                                selectedDecos: [],
                                decoGroups: [],
                                // Range settings: dialog visibility, whether to show line, numeric value, and infinite flag
                                rangeDialogOpen: false,
                                rangeVisible: false,
                                rangeValue: 60,
                                rangeInfinite: false,
                                rangeError: null,
                                hotkeyDialogOpen: false,
                                insertDialogOpen: false,
                                insertPrefs: insertPrefs,
                                insertDraftPlacement: insertPrefs.placement,
                                insertDraftIndex: String(insertPrefs.index),
                                insertDraftScopes: Object.assign({}, insertPrefs.scopes),
                                editValues: {
                                    rotate: 0,
                                    scaleX: 1,
                                    scaleY: 1,
                                    posX: 0,
                                    posY: 0,
                                    stageScale: this.actorStage.scale
                                }
                            }, this.setCampAndGender(f.CAMP1, F.MALE, null, !1))
                        }
                        getDefaultInsertPrefs() {
                            return {
                                placement: "top",
                                index: 1,
                                scopes: {
                                    palette: true,
                                    copy: true,
                                    mergeBatch: true
                                }
                            }
                        }
                        sanitizeInsertPrefs(e) {
                            const t = this.getDefaultInsertPrefs()
                              , i = e && "object" == typeof e ? e : {}
                              , a = ["top", "bottom", "after_index"].includes(i.placement) ? i.placement : t.placement
                              , o = Number(i.index)
                              , s = isFinite(o) && !isNaN(o) && o >= 1 ? Math.floor(o) : t.index
                              , n = i.scopes && "object" == typeof i.scopes ? i.scopes : {};
                            return {
                                placement: a,
                                index: s,
                                scopes: {
                                    palette: void 0 === n.palette ? t.scopes.palette : !!n.palette,
                                    copy: void 0 === n.copy ? t.scopes.copy : !!n.copy,
                                    mergeBatch: void 0 === n.mergeBatch ? t.scopes.mergeBatch : !!n.mergeBatch
                                }
                            }
                        }
                        cloneInsertPrefs(e) {
                            const t = this.sanitizeInsertPrefs(e);
                            return {
                                placement: t.placement,
                                index: t.index,
                                scopes: Object.assign({}, t.scopes)
                            }
                        }
                        loadInsertPrefs() {
                            try {
                                if ("undefined" != typeof window && window.localStorage) {
                                    const e = window.localStorage.getItem(this.insertPrefsStorageKey);
                                    if (e)
                                        return this.sanitizeInsertPrefs(JSON.parse(e))
                                }
                            } catch (e) {
                                console.warn("Failed to load insert prefs:", e);
                            }
                            return this.getDefaultInsertPrefs()
                        }
                        persistInsertPrefs(e) {
                            const t = this.sanitizeInsertPrefs(e);
                            try {
                                "undefined" != typeof window && window.localStorage && window.localStorage.setItem(this.insertPrefsStorageKey, JSON.stringify(t))
                            } catch (e) {
                                console.warn("Failed to save insert prefs:", e);
                            }
                            return t
                        }
                        openInsertModal() {
                            const e = this.cloneInsertPrefs(this.state.insertPrefs);
                            this.setState({
                                insertDialogOpen: true,
                                insertDraftPlacement: e.placement,
                                insertDraftIndex: String(e.index),
                                insertDraftScopes: Object.assign({}, e.scopes)
                            })
                        }
                        isValidInsertIndexValue(e) {
                            if ("number" == typeof e)
                                return isFinite(e) && !isNaN(e) && e >= 1 && Math.floor(e) === e;
                            if ("string" != typeof e)
                                return !1;
                            const t = e.trim();
                            return !!t && /^\d+$/.test(t) && Number(t) >= 1
                        }
                        getInsertDraftPrefs() {
                            const e = this.state.insertDraftScopes || this.getDefaultInsertPrefs().scopes;
                            return {
                                placement: this.state.insertDraftPlacement || "top",
                                index: this.isValidInsertIndexValue(this.state.insertDraftIndex) ? Math.floor(Number(this.state.insertDraftIndex)) : null,
                                scopes: {
                                    palette: !!e.palette,
                                    copy: !!e.copy,
                                    mergeBatch: !!e.mergeBatch
                                }
                            }
                        }
                        onInsertModalConfirm() {
                            const e = this.getInsertDraftPrefs();
                            if ("after_index" == e.placement && (!e.index || e.index < 1))
                                return;
                            const t = this.persistInsertPrefs({
                                placement: e.placement,
                                index: e.index || 1,
                                scopes: e.scopes
                            });
                            this.setState({
                                insertDialogOpen: false,
                                insertPrefs: t,
                                insertDraftPlacement: t.placement,
                                insertDraftIndex: String(t.index),
                                insertDraftScopes: Object.assign({}, t.scopes)
                            })
                        }
                        isInsertScopeEnabled(e) {
                            const t = this.state && this.state.insertPrefs ? this.state.insertPrefs : this.getDefaultInsertPrefs();
                            return !!(t.scopes && t.scopes[e])
                        }
                        resolveInsertIndexFromPrefs(e, t=null) {
                            const i = Array.isArray(t) ? t : this.decoManager && this.decoManager.items ? this.decoManager.items : []
                              , a = i.length;
                            if (!a)
                                return 0;
                            const o = this.sanitizeInsertPrefs(e);
                            switch (o.placement) {
                            case "bottom":
                                return 0;
                            case "after_index": {
                                const e = Math.min(Math.max(o.index || 1, 1), a);
                                return Math.min(a, Math.max(0, a - e))
                            }
                            case "top":
                            default:
                                return a
                            }
                        }
                        getCreateInsertIndex(e, t) {
                            return this.isInsertScopeEnabled(e) ? this.resolveInsertIndexFromPrefs(this.state.insertPrefs) : "function" == typeof t ? t() : t
                        }
                        markHistoryDirty() {
                            this._unmounted || (this._historyMutationVersion++,
                            this._historyBatchDepth > 0 && (this._historyBatchDirty = !0))
                        }
                        beginHistoryBatch() {
                            this._unmounted || (0 === this._historyBatchDepth && (this._historyBatchDirty = !1),
                            this._historyBatchDepth++)
                        }
                        commitHistoryBatch() {
                            if (this._unmounted)
                                return;
                            this._historyBatchDepth > 0 && this._historyBatchDepth--;
                            if (0 === this._historyBatchDepth && this._historyBatchDirty) {
                                this._historyBatchDirty = !1,
                                this.pushHistory()
                            }
                        }
                        commitHistoryMutation() {
                            this.markHistoryDirty(),
                            this._historyBatchDepth > 0 ? this._historyBatchDirty = !0 : this.pushHistory()
                        }
                        pushHistory(e) {
                            if (this._unmounted || !this.decoManager)
                                return;
                            const t = e && e.force;
                            if (!t && this._historyBatchDepth > 0)
                                return void (this._historyBatchDirty = !0);
                            if (!t && this._historyMutationVersion === this._lastHistoryVersion)
                                return;
                            const select = this.decoManager.getSelectedDecoIndexes()
                              , role = JSON.stringify(this.exportRoleDesignData().exportSyncJson())
                              , currentGroups = createRoleEditorGroupSnapshot(this.state.decoGroups || [], this.decoManager.items || [], "items")
                              , signature = JSON.stringify(select) + "|" + role + "|" + JSON.stringify(currentGroups);
                            if (signature === this._lastHistorySignature)
                                return void (this._lastHistoryVersion = this._historyMutationVersion);
                            this.historyIndex >= 0 && this.historyIndex < this.history.length - 1 && (this.history.length = this.historyIndex + 1),
                            this.history.push({
                                select: select,
                                role: role,
                                groups: currentGroups
                            });
                            for (; this.history.length > 200; )
                                this.history.shift();
                            this.historyIndex = this.history.length - 1,
                            this._lastHistorySignature = signature,
                            this._lastHistoryVersion = this._historyMutationVersion
                        }
                        loadHistory(e) {
                            this.historyIndex = e;
                            let t = this.history[e]
                              , i = JSON.parse(t.role)
                              , a = d.createFromJson(i);
                            this.importRoleDesignData(a);

                            this._lastHistorySignature = JSON.stringify(t.select || []) + "|" + t.role + "|" + JSON.stringify(t.groups || []),
                            this._lastHistoryVersion = this._historyMutationVersion;
                            const o = restoreRoleEditorGroupsFromSnapshot(t.groups || [], this.decoManager.items || [], new Map);
                            this.decoGroupMap = o.map,
                            o.maxNumericId >= this.groupIdCounter && (this.groupIdCounter = o.maxNumericId + 1),
                            this.setState({
                                decoGroups: o.groups,
                                decos: this.decoManager.items
                            });

                            this.decoManager.selectDecoIndex(t.select)
                        }
                        goHistory(e) {
                            let t = Math.min(this.history.length - 1, Math.max(0, this.historyIndex + e));
                            t >= 0 && t != this.historyIndex && this.loadHistory(t)
                        }
                        componentDidMount() {
                            const handleObservedResize = () => {
                                this.resizeTimer && (clearTimeout(this.resizeTimer), this._pendingTimers.delete(this.resizeTimer)),
                                this.resizeTimer = this.setTrackedTimeout((() => {
                                    this.initPartInfiScroll(),
                                    this.updateActorPosition()
                                }
                                ), 50)
                            };
                            if ("undefined" != typeof ResizeObserver) {
                                this.resizeObserver = new ResizeObserver(handleObservedResize),
                                this.choiceListRef.current && this.resizeObserver.observe(this.choiceListRef.current),
                                this.editListRef.current && this.resizeObserver.observe(this.editListRef.current)
                            } else {
                                this.resizeObserver = null,
                                this._resizeFallback = handleObservedResize,
                                window.addEventListener("resize", this._resizeFallback)
                            }
                            this.props.emitter.on("requestJson", this.onRequestJson, this),
                            s.on(o.EVENT.STAGE_RESIZED, this.onResized, this),
                            s.root.addChild(this.actorStage),
                            this.actorStage.addChild(this.actorClip),
                            this.actorClip.footContainer.loop = !1,
                            this.updateActorPosition(),
                            $(this.stageRef.current).append(s.renderer.view),
                            this._rangeInputs = [this.rotateInputRef.current, this.scaleInputRef.current, this.ratioInputRef.current].filter((e => !!e)),
                            this._rangeInputs.forEach((e => e.addEventListener("change", this.onRangeInputChange))),
                            W.on(A.DOWN, this.onKeyDown, this),
                            W.on(A.RELEASED, this.onKeyUp, this),
                            this.decoManager.on(p.DecoManager.EVENT.SELECT, this.onItemSelected, this),
                            this.decoManager.on(p.DecoManager.EVENT.DECOLIST, this.onDecolistUpdate, this),
                            this.decoManager.selectDecos([]),
                            // Sync initial range from deco controller if available
                            (function(){
                                const decoCtrl = this.decoManager && this.decoManager.decoController;
                                if (decoCtrl && typeof decoCtrl.positionRange === 'number') {
                                    this.setState({
                                        rangeValue: isFinite(decoCtrl.positionRange) ? decoCtrl.positionRange : null,
                                        rangeInfinite: !isFinite(decoCtrl.positionRange)
                                    });
                                }
                            }).call(this),
                            this.sortable = new Sortable(this.editListRef.current, {
                                group: 'decos',
                                draggable: ".dragBlock, .groupRow",
                                filter: ".spacerBlock, .paddingBlock",
                                animation: this.getSortableAnimation(),
                                scroll: true,
                                scrollSpeed: 20,
                                onStart: (evt) => {
                                    // FIX: Disable top spacer during drag to prevent scroll jump
                                    this.topSpacerSafe = false;
                                    
                                    // FIX: Snapshot scroll anchor (First visible item)
                                    this.dragAnchor = null;
                                    const container = this.editListRef.current;
                                    if (container) {
                                        const children = Array.from(container.children);
                                        // Find first visible child that is a valid item/group (has data-key or data-id, not a spacer)
                                        // A child is "visible" if its bottom is below scrollTop (it overlaps the view)
                                        // We pick the one closest to the top edge.
                                        const scrollTop = container.scrollTop;
                                        const anchorNode = children.find(child => {
                                            if (child.classList.contains('spacerBlock')) return false;
                                            return (child.offsetTop + child.offsetHeight) > scrollTop;
                                        });

                                        if (anchorNode) {
                                            this.dragAnchor = {
                                                key: anchorNode.getAttribute('data-key'), // Item Key
                                                id: anchorNode.getAttribute('data-id'),   // Group ID
                                                offset: anchorNode.offsetTop - scrollTop  // Distance from Top Edge
                                                // Note: offsetTop is relative to offsetParent (the container usually). 
                                                // If container is positioned, offsetTop is distance from container top border.
                                                // scrollTop is pixels scrolled.
                                                // visualPosition = offsetTop - scrollTop.
                                                // We want to preserve visualPosition.
                                            };
                                        }
                                    }

                                    // Store local drag state specifically for virtualization
                                    this.localDragState = {
                                        active: true,
                                        itemIndex: evt.item.getAttribute("data-index"),
                                        isGroup: evt.item.classList.contains("groupRow"),
                                        groupId: evt.item.getAttribute("data-id")
                                    };
                                    this.setState({
                                        layoutVersion: (this.state.layoutVersion || 0) + 1
                                    });
                                },
                                onEnd: (evt) => {
                                    // FIX: Keep virtualization disabled briefly to allow smooth scroll restoration
                                    this.isSettling = true;
                                    
                                    this.localDragState = null;
                                    // FIX: Scroll restoration is now handled inside onSortEnd after setState completes
                                    this.onSortEnd(evt);
                                },
                                onMove: (evt) => {
                                    // Prevent groups from being dragged into other groups (nested lists)
                                    if (evt.dragged && evt.dragged.classList.contains("groupRow")) {
                                        // If the target list is not the root list, forbid the move
                                        if (evt.to !== this.editListRef.current) {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                            }),
                            this.state.ingame && (this.importRoleDesignData(this.state.ingame.role),
                            this.isLocked() && this.alertAndPurchaseUnlockSlotItem().then(( () => this.refreshSlotLock()))),
                            this.initPartInfiScroll(),
                            this.pushHistory({
                                force: !0
                            }),
                            e.Base.system.devMode && this.alertAndPurchaseUnlockSlotItem()
                        }
                        loadSteamCurrency() {
                            return X(this, void 0, void 0, (function*() {
                                if (j() && !this.state.steamCurrency) {
                                    let e = yield D.getSteamCurrencyType();
                                    this.setState({
                                        steamCurrency: e
                                    })
                                }
                            }
                            ))
                        }
                        componentDidUpdate(prevProps, prevState) {
                             this.initPartInfiScroll();
                             if (this.sortable && prevState.decos !== this.state.decos) {
                                 const animation = this.getSortableAnimation();
                                 this.sortable.option("animation") !== animation && this.sortable.option("animation", animation),
                                 this.groupSortables && this.groupSortables.forEach((s => s && s.option && s.option("animation", animation)))
                             }
                             // FIX: Skip anchor restoration during settling (handled in onSortEnd)
                             if (this.isSettling) {
                                 return;
                             }
                             
                             // FIX: Scroll Anchoring for both Drag Start and Drag End
                             // Use requestAnimationFrame to ensure DOM layout is complete before measuring
                             const restoreAnchor = (anchor) => {
                                 if (!anchor || !this.editListRef.current) return;
                                 
                                 const container = this.editListRef.current;
                                 
                                 requestAnimationFrame(() => {
                                     // Try to find the same node by ID (Group) or Key (Item)
                                     let node = null;
                                     if (anchor.id) {
                                         node = container.querySelector(`[data-id="${anchor.id}"]`);
                                     } else if (anchor.key) {
                                         node = container.querySelector(`[data-key="${anchor.key}"]`);
                                     }
                                     
                                     if (node) {
                                         // Recover position: offsetTop - scrollTop = offset
                                         // scrollTop = offsetTop - offset
                                         container.scrollTop = node.offsetTop - anchor.offset;
                                     }
                                 });
                             };

                             if (this.localDragState && this.localDragState.active && this.dragAnchor) {
                                 restoreAnchor(this.dragAnchor);
                                 this.dragAnchor = null;
                             }
                             // Note: Drop anchor restoration is now handled in onEnd with setTimeout
                        }
                        componentWillUnmount() {
                            this._unmounted = !0,
                            // Clear any pending resize debounce timer
                            this.resizeTimer && (clearTimeout(this.resizeTimer), this._pendingTimers.delete(this.resizeTimer), this.resizeTimer = null),
                            this._pendingTimers && (this._pendingTimers.forEach((e => window.clearTimeout(e))), this._pendingTimers.clear()),
                            this._rangeInputs && this._rangeInputs.forEach((e => e && e.removeEventListener("change", this.onRangeInputChange))),
                            this._rangeInputs = null,
                            this._resizeFallback && (window.removeEventListener("resize", this._resizeFallback), this._resizeFallback = null),
                            this.resizeObserver && this.resizeObserver.disconnect(),
                            this.onRightResizeEnd && this.onRightResizeEnd(),
                            this.partInfiScroll && this.partInfiScroll.dispose(),
                            this.sortable && this.sortable.destroy(),
                            this.groupSortables && (this.groupSortables.forEach(s => s.destroy()), this.groupSortables.clear()),
                            this.decoManager.dispose(),
                            s.off(o.EVENT.STAGE_RESIZED, this.onResized, this),
                            W.off(A.DOWN, this.onKeyDown, this),
                            W.off(A.RELEASED, this.onKeyUp, this),
                            this.props.emitter.off("requestJson", this.onRequestJson, this),
                            this.props.emitter && this.props.emitter.dispose && this.props.emitter.dispose()
                        }
                        onKeyUp(e, t) {
                            let i = this.decoManager.decoController;
                            if (t.ctrlKey)
                                ;
                            else if (i && i.container)
                                switch (e) {
                                case M.DOWN:
                                case M.S:
                                case M.UP:
                                case M.W:
                                case M.RIGHT:
                                case M.D:
                                case M.LEFT:
                                case M.A:
                                case M.C:
                                case M.V:
                                case M.X:
                                case M.Z:
                                    this.commitHistoryMutation()
                                }
                        }
                        onKeyDown(e, t) {
                            let i = this.decoManager.decoController;
                            if (t.ctrlKey) {
                                const a = this.isTextEditableTarget(t.target)
                                  , o = "BracketLeft" === t.code || 219 === e
                                  , s = "BracketRight" === t.code || 221 === e;
                                if (t.shiftKey && (o || s)) {
                                    if (a)
                                        return;
                                    return t.preventDefault && t.preventDefault(),
                                    void this.moveSelectedDecosToBoundary(s ? "top" : "bottom");
                                }
                                if (a)
                                    return;
                                switch (e) {
                                case M.Z:
                                    this.goHistory(-1);
                                    break;
                                case M.Y:
                                    this.goHistory(1);
                                    break;
                                case 89: // Y (fallback if M.Y is not 89)
                                    this.goHistory(1);
                                    break;
                                case M.C:
                                    this.copySelectedDecos();
                                    break;
                                case M.V:
                                    this.pasteCopiedDecos();
                                    break;
                                case M.A:
                                    if (t.preventDefault) t.preventDefault();
                                    if (this.state.decos) {
                                        const allItems = this.state.decos.filter(d => !d.isHead());
                                        this.decoManager.selectDecos(allItems);
                                        this.refreshEditValues();
                                    }
                                    break;
                                case 71: // G
                                    if (t.preventDefault) t.preventDefault();
                                    if (this.state.selectedDecos && this.state.selectedDecos.length > 0) {
                                        this.createDecoGroup(this.state.selectedDecos);
                                    }
                                    break;
                                }
                            } else if (i && i.container && !i.hasHead()) {
                                // 避免正在輸入文字時誤觸快捷鍵 (Avoid shortcuts when typing)
                                if (this.isTextEditableTarget(t.target)) {
                                    return;
                                }

                                const s = i.container;
                                switch (e) {
                                case M.DOWN:
                                case M.S:
                                    i.move(0, 1),
                                    this.refreshEditValues();
                                    break;
                                case M.UP:
                                case M.W:
                                    i.move(0, -1),
                                    this.refreshEditValues();
                                    break;
                                case M.RIGHT:
                                case M.D:
                                    i.move(1, 0),
                                    this.refreshEditValues();
                                    break;
                                case M.LEFT:
                                case M.A:
                                    i.move(-1, 0),
                                    this.refreshEditValues();
                                    break;
                                case M.C:
                                    {
                                        let e = g.normalizeDegrees(i.getRotationDeg() + x.DecoConstant.ROTATE_STEP);
                                        i.setRotationDeg(e),
                                        this.refreshEditValues()
                                    }
                                    break;
                                case M.V:
                                    {
                                        let e = g.normalizeDegrees(i.getRotationDeg() - x.DecoConstant.ROTATE_STEP);
                                        i.setRotationDeg(e),
                                        this.refreshEditValues()
                                    }
                                    break;
                                case M.Z:
                                    {
                                        let e = s.scaleY / s.scaleX;
                                        if (t.shiftKey)
                                            e = Math.min(i.ratioRange.max, e + x.DecoConstant.SCALE_RATIO_STEP),
                                            i.setScale(s.scaleX, Math.abs(s.scaleX) * e);
                                        else {
                                            let t = s.scaleX > 0 ? 1 : -1
                                              , a = Math.min(i.scaleRange.max, Math.abs(s.scaleX) + x.DecoConstant.SCALE_STEP);
                                            i.setScale(a * t, a * e)
                                        }
                                        this.refreshEditValues()
                                    }
                                    break;
                                case M.X:
                                    {
                                        let e = s.scaleY / s.scaleX;
                                        if (t.shiftKey)
                                            e = Math.max(i.ratioRange.min, e - x.DecoConstant.SCALE_RATIO_STEP),
                                            i.setScale(s.scaleX, Math.abs(s.scaleX) * e);
                                        else {
                                            let t = s.scaleX > 0 ? 1 : -1
                                              , a = Math.max(i.scaleRange.min, Math.abs(s.scaleX) - x.DecoConstant.SCALE_STEP);
                                            i.setScale(a * t, a * e)
                                        }
                                        this.refreshEditValues()
                                    }
                                    break;
                                case 8: // Backspace
                                case 46: // Delete
                                    if (this.state.selectedDecos && this.state.selectedDecos.length > 0) {
                                        const toDelete = [...this.state.selectedDecos];
                                        this.decoManager.removeDecos(toDelete.filter((deco => deco && !(deco.isHead && deco.isHead()))));
                                        this.decoManager.selectDecos([]);
                                        this.refreshEditValues();
                                        this.commitHistoryMutation();
                                        if (t.preventDefault) t.preventDefault();
                                    }
                                    break;
                                }
                            }
                        }
                        isInGameEditor() {
                            return !!this.props.ingame
                        }
                        onItemSelected(e) {
                            this.commitPositionInputChanges(),
                            this.setState({
                                selectedDecos: e
                            }),
                            this.refreshEditValues()
                        }
                        refreshEditValues() {
                            let e = Object.assign({}, this.state.editValues || {});
                            if (this.decoManager.decoController) {
                                let t = this.decoManager.decoController
                                  , i = t.container;
                                e.rotate = i.rotationDeg,
                                e.scaleX = i.scaleX,
                                e.scaleY = i.scaleY;
                                if (t.decos.length > 1) {
                                    const a = t.decos[0].clip;
                                    e.posX = a ? a.x : 0,
                                    e.posY = a ? a.y : 0
                                } else
                                    e.posX = i.x,
                                    e.posY = i.y
                            } else
                                e.rotate = 0,
                                e.scaleX = 1,
                                e.scaleY = 1,
                                e.posX = 0,
                                e.posY = 0,
                                this.positionInputEdited = !1;
                            this.setState({
                                editValues: e
                            })
                        }
                        commitPositionInputChanges() {
                            this.positionInputEdited && (this.positionInputEdited = !1,
                            this.commitHistoryMutation())
                        }
                        onPositionInputChange(e, t) {
                            if (this.decoManager.decoController && !this.decoManager.decoController.hasHead()) {
                                let i = Number(t.target.value);
                                isNaN(i) && (i = 0);
                                let a = this.decoManager.decoController;
                                if (!a.decos.length)
                                    return;
                                let o = !1;
                                if (a.decos.length > 1) {
                                    const t = a.decos[0].clip;
                                    if (!t)
                                        return;
                                    let s = "x" == e ? i : t.x
                                      , n = "y" == e ? i : t.y
                                      , r = s - t.x
                                      , l = n - t.y;
                                    Math.abs(r) < 1e-3 && Math.abs(l) < 1e-3 || (a.move(r, l),
                                    o = !0)
                                } else {
                                    let t = a.container
                                      , s = "x" == e ? i : t.x
                                      , n = "y" == e ? i : t.y
                                      , r = a.manager.positionRange || 60;
                                    if (r && r > 0) {
                                        let e = Math.sqrt(s * s + n * n);
                                        e > r && (s *= r / e,
                                        n *= r / e)
                                    }
                                    Math.abs(s - t.x) < 1e-3 && Math.abs(n - t.y) < 1e-3 || (a.setPosition(s, n),
                                    o = !0)
                                }
                                o && (this.refreshEditValues(),
                                this.positionInputEdited = !0)
                            }
                        }
                        onPositionInputBlur() {
                            this.commitPositionInputChanges()
                        }
                        onPositionInputKeyUp(e) {
                            ("Enter" == e.key || "Escape" == e.key) && this.onPositionInputBlur()
                        }
                        onDecolistUpdate(e) {
                            // FIX: Skip state update during settling to prevent scroll jump
                            if (this.isSettling) {
                                return;
                            }
                            this.setState({
                                decos: e,
                                decoGroups: this.syncDecoGroups(e)
                            })
                        }
                        onRequestJson(e) {
                            this.props.appUsage.usage
                        }
                        calcStageScale() {
                            return e.Base.pixi.stage.scaleX
                        }
                        onResized() {
                            this.setState({
                                stageScale: this.calcStageScale()
                            }),
                            this.updateActorPosition()
                        }
                        updateActorPosition() {
                            if (!this.stageBgRef.current || !s.root)
                                return;
                            let e = $(this.stageBgRef.current).offset();
                            if (!e)
                                return;
                            let t = new PIXI.Point(e.left,e.top);
                            t = s.root.toLocal(t),
                            t.x += 68,
                            t.y += 98,
                            this.actorStage.position.set(t.x, t.y)
                        }
                        onBtnTab(e) {
                            if (this.partInfiScroll) {
                                this.partInfiScroll.dispose();
                                this.partInfiScroll = null;
                                this.partChoiceElByCode.clear();
                                this.selectedChoiceEl = null;
                                if (this.choiceListRef.current) {
                                    this.choiceListRef.current.innerHTML = "";
                                }
                            }
                            this.setState({
                                currTab: e
                            })
                        }
                        onBtnPart(t, i) {
                            let a = this.state.roleComponentCode;
                            if ("head" == t.code)
                                this.decoManager.head.clip.gotoAndStop(i.code),
                                a.head = i.code;
                            else if ("cape" == t.code)
                                this.actorClip.capeClip.setFrame(i.code),
                                a.cape = i.code;
                            else if ("hand" == t.code)
                                this.actorClip.leftHand.setFrame(i.code),
                                this.actorClip.rightHand.setFrame(i.code),
                                a.hand = i.code;
                            else if ("foot" == t.code)
                                this.actorClip.leftFoot.setFrame(i.code),
                                this.actorClip.rightFoot.setFrame(i.code),
                                this.actorClip.footContainer.gotoAndPlay(1),
                                a.foot = i.code;
                            else if ("deco" == t.code) {
                                let t = this.getCreateInsertIndex("palette", (() => this.decoManager && this.decoManager.items ? this.decoManager.items.length : 0))
                                  , o = this.decoManager.addDeco(i.code, t)
                                  , s = this.isInsertScopeEnabled("palette") ? this.sanitizeInsertPrefs(this.state.insertPrefs).placement : "top";
                                o.clip.scale.set(.5),
                                this.decoManager.selectDecos([o]);
                                if ("top" === s) {
                                    let a = this.editListRef.current;
                                    e.Base.wait(10).then(( () => {
                                        a && a.scrollTo && a.scrollTo({
                                            left: 0,
                                            top: -a.scrollHeight + a.clientHeight
                                        })
                                    }
                                    ))
                                }
                            }
                            this.commitHistoryMutation(),
                            this.setState({
                                roleComponentCode: a
                            })
                        }
                        onBtnSelected(e, t) {
                            if (!t)
                                return;
                            let i = (this.state.selectedDecos || []).slice();
                            e.ctrlKey ? v.removeElement(i, t) ? this.decoManager.selectDecos(i) : this.decoManager.addSelectDeco(t) : 1 == i.length && i[0] == t ? this.decoManager.selectDecos([]) : this.decoManager.selectDecos([t])
                        }
                        onChoiceBlockDragStart(e, t, forceItems = null) {
                            let i = [];
                            if (forceItems) {
                                i = forceItems;
                            } else {
                                const a = this.state.selectedDecos || [];
                                a.includes(t) && (i = a.filter((e => e && this.decoManager.items.includes(e)))),
                                i.length || (i = [t]);
                            }
                            this.currentDraggingDecos = i.slice(),
                            this.decoManager.selectDecos([]),
                            this.setState({
                                draggingDecos: i
                            }),
                            this.dragcount = 0
                        }
                        removeInsertItem() {
                            this.insertItem && (this.insertItem.dispose(),
                            this.insertItem = null)
                        }
                        onChoiceBlockDragEnd(e) {
                            this.removeInsertItem();
                            const t = (this.state.draggingDecos && this.state.draggingDecos.length ? this.state.draggingDecos : this.currentDraggingDecos) || [];
                            let i = {
                                draggingDecos: []
                            };
                            if (t.length) {
                                let e = this.state.decos.findIndex((e => !e || !e.code));
                                if (-1 == e)
                                    return this.currentDraggingDecos = [],
                                    void this.setState(i);
                                this.moveDraggingDecos(t, e) && this.commitHistoryMutation()
                            } else
                                i.decos = this.decoManager.items;
                            this.currentDraggingDecos = [],
                            this.setState(i)
                        }
                        onChoiceBlockDragEnter(e, t) {
                            this.dragcount++;
                            const i = (this.state.draggingDecos && this.state.draggingDecos.length ? this.state.draggingDecos : this.currentDraggingDecos) || [];
                            if (this.state.decos[t] == this.insertItem)
                                return;
                            if (i.length) {
                                const e = this.getDraggingIndexes(i);
                                if (e.some((e => e == t || e + 1 == t)))
                                    return void this.removeInsertItem()
                            }
                            let a = this.decoManager.items.slice();
                            this.insertItem || (this.insertItem = new u.DecoItem(this.decoManager,null)),
                            a.splice(t, 0, this.insertItem),
                            this.setState({
                                decos: a
                            })
                        }
                        getDraggingIndexes(e) {
                            return getRoleEditorDraggingIndexes(this.decoManager, e)
                        }
                        moveDraggingDecos(e, t) {
                            return moveRoleEditorDraggingDecos(this.decoManager, e, t)
                        }
                        setStageScale(e) {
                            this.actorStage.scale.set(e),
                            this.setState({
                                stageScale: e,
                                editValues: Object.assign({}, this.state.editValues || {}, {
                                    stageScale: e
                                })
                            })
                        }
                        exportRoleDesignData() {
                            let e = new d(l.getDefault(this.state.selectedCamp, this.state.selectedGender.female));
                            return e.customRoleConfig = this.exportConfig(),
                            e
                        }
                        setCampAndGender(e, t, i, a=!0) {
                            L.forEach((t => t.reset(e))),
                            i || ((i = new h).head = {
                                f: J("head", e),
                                s: 1
                            },
                            i.cape = {
                                f: 11,
                                s: 1
                            },
                            i.hand = {
                                f: J("hand", e),
                                s: 1
                            },
                            i.foot = {
                                f: J("foot", e),
                                s: 1
                            },
                            i.decolist.push(new y(y.HEAD_CODE,0,0,1,1,0)));
                            let o = new d(l.getDefault(e, t.female));
                            o.customRoleConfig = i,
                            this.actorClip.headClip.removeDisguise(),
                            this.actorClip.setRole(o),
                            this.decoManager.importConfig(i),
                            this.actorClip.headClip.setDisguise(this.decoManager.root);
                            let s = {
                                selectedCamp: e,
                                selectedGender: t,
                                decos: this.decoManager.items,
                                roleComponentCode: {
                                    head: i.head.f,
                                    cape: i.cape.f,
                                    hand: i.hand.f,
                                    foot: i.foot.f
                                }
                            };
                            return a && this.setState(s),
                            s
                        }
                        exportThumb() {
                            return e.Base.pixi.displayObjectToDataUrl(this.actorClip, {
                                mime: "image/png",
                                bgAlpha: 0
                            })
                        }
                        importRoleDesignData(t) {
                            this.setCampAndGender(t.defaultRole.defaultCamp, t.defaultRole.female ? F.FEMALE : F.MALE, t.customRoleConfig)
                        }
                        exportConfig() {
                            let e = new h;
                            return e.head = Y(this.decoManager.head),
                            e.cape = Y(this.actorClip.capeClip),
                            e.hand = Y(this.actorClip.leftHand),
                            e.foot = {
                                f: this.actorClip.leftFoot.frame,
                                s: this.actorClip.footContainer.scaleX
                            },
                            e.decolist = this.decoManager.items.map((e => e.exportRoleDeco())),
                            e
                        }
                        updatePartChoiceSelection(e) {
                            const t = null == e ? null : String(e);
                            this.selectedChoiceEl && (!this.selectedChoiceEl.isConnected || this.selectedChoiceEl.getAttribute("data-code") !== t) && this.selectedChoiceEl.classList.remove("selected");
                            if (null == t)
                                return void (this.selectedChoiceEl = null);
                            const i = this.partChoiceElByCode && this.partChoiceElByCode.get(t);
                            i ? (i.classList.add("selected"),
                            this.selectedChoiceEl = i) : this.selectedChoiceEl = null
                        }
                        initPartInfiScroll() {
                            const tab = this.state.currTab;
                            if (!tab || !tab.options || tab.loading || !this.choiceListRef.current) return;

                            const container = this.choiceListRef.current;
                            // 根據 CSS 計算精確的單個項目寬度：
                            // .choiceBlock { width: 50, padding: 10, border: 2, margin: 5 }
                            // 總寬度 = 50 + 10*2 + 2*2 + 5*2 = 84px
                            const ITEM_SIZE = 84; 
                            const itemsPerRow = Math.max(1, Math.floor(container.clientWidth / ITEM_SIZE));

                            const options = tab.options;
                            const totalRows = Math.ceil(options.length / itemsPerRow);
                            const selectedCode = this.state.roleComponentCode[tab.code];

                            if (this.partInfiScroll) {
                                if (this.partInfiScroll.__tabCode === tab.code && 
                                    this.partInfiScroll.__itemsPerRow === itemsPerRow &&
                                    this.partInfiScroll.__size === totalRows) {
                                    this.partInfiScroll.__selectedCode !== selectedCode && (this.updatePartChoiceSelection(selectedCode),
                                    this.partInfiScroll.__selectedCode = selectedCode);
                                    return;
                                }
                                this.partInfiScroll.dispose();
                                this.partChoiceElByCode.clear();
                                this.selectedChoiceEl = null;
                            }

                            this.partChoiceElByCode.clear();
                            this.selectedChoiceEl = null;
                            this.partInfiScroll = new InfiScroll(container, {
                                generator: (rowIdx, callback) => {
                                    // 使用原本的 "material" class，以繼承原始 CSS 定義的佈局
                                    const rowEl = document.createElement("div");
                                    rowEl.className = "material";
                                    rowEl.style.width = "100%";
                                    rowEl.style.boxSizing = "border-box";
                                    rowEl.style.overflow = "hidden";

                                    const currentSelectedCode = this.state.roleComponentCode && this.state.roleComponentCode[tab.code];
                                    for (let i = 0; i < itemsPerRow; i++) {
                                        const itemIdx = rowIdx * itemsPerRow + i;
                                        if (itemIdx >= options.length) break;

                                        const item = options[itemIdx];
                                        const itemEl = document.createElement("div");
                                        itemEl.className = "choiceBlock button " + (currentSelectedCode == item.code ? "selected" : "");
                                        itemEl.setAttribute("data-code", String(item.code));
                                        this.partChoiceElByCode.set(String(item.code), itemEl);
                                        currentSelectedCode == item.code && (this.selectedChoiceEl = itemEl);
                                        
                                        itemEl.onclick = (e) => {
                                            e.stopPropagation();
                                            this.onBtnPart(tab, item);
                                            this.selectedChoiceEl && this.selectedChoiceEl !== itemEl && this.selectedChoiceEl.classList.remove("selected");
                                            itemEl.classList.add("selected");
                                            this.selectedChoiceEl = itemEl;
                                            this.partInfiScroll && (this.partInfiScroll.__selectedCode = item.code);
                                        };

                                        const img = document.createElement("img");
                                        img.src = item.dataUrl;
                                        img.draggable = false;
                                        
                                        itemEl.appendChild(img);
                                        rowEl.appendChild(itemEl);
                                    }
                                    callback(rowEl);
                                },
                                size: totalRows,
                                childSize: ITEM_SIZE,
                                fixedSize: true,
                                elementLimit: 120,
                                cacheSize: 48
                            });
                            this.partInfiScroll.__tabCode = tab.code;
                            this.partInfiScroll.__itemsPerRow = itemsPerRow;
                            this.partInfiScroll.__size = totalRows;
                            this.partInfiScroll.__selectedCode = selectedCode;
                        }

                        renderPartList(e) {
                            // 1. 處理 Loading 和空資料 (這部分保持不變)
                            if (e.loading || !e.options) {
                                if (!e.options && !e.loading) e.prepareOptions().then((() => this.setState({currTab: this.state.currTab, decos: this.state.decos})));
                                return React.createElement("div", { className: e == this.state.currTab ? "loading" : "hidden", key: e.code }, 
                                    React.createElement(MaterialUI.CircularProgress, { color: "inherit" })
                                );
                            }

                            // 2. 非當前標籤直接隱藏 (這部分保持不變)
                            if (e != this.state.currTab) {
                                return React.createElement("div", { className: "hidden", key: e.code });
                            }

                            // 當前標籤且已載入完成，回傳 null 讓 InfiScroll 接管載體容器的子節點
                            return null;
                        }
                        queryItemPrice(t) {
                            if (this.itemPrice)
                                return Promise.resolve(this.itemPrice);
                            {
                                let i, a;
                                e.GLT.components.showLoading();
                                const o = [e.GLT.commands.itemService.listGameItemsByCodes([t], (e => {
                                    i = e[0]
                                }
                                ))];
                                return B.user.guest || o.push(e.GLT.commands.transactionService.listPurchaseItemTransactions(t, 0, 1, (e => {
                                    a = e && e.length > 0
                                }
                                ))),
                                e.GLT.client.submitCommands(o).then(( () => {
                                    e.GLT.components.hideLoading();
                                    let t = i.priceInGltDollar;
                                    return a && (t = Math.ceil(t - t * i.buyAgainOff / 100)),
                                    this.itemPrice = {
                                        price: t,
                                        buyAgain: a
                                    },
                                    this.itemPrice
                                }
                                ))
                            }
                        }
                        alertAndPurchaseUnlockSlotItem() {
                            const t = this.state.ingame || {
                                role: d.createFromRoleSet(l.OFFICIAL.REVOLUTION_WARRIOR),
                                slot: 1
                            }
                              , i = C.roleManager
                              , a = t.role.defaultRole.defaultCamp
                              , o = i ? i.getUnlockSlotItemCode(t.role.defaultRole.defaultCamp, t.slot) : "TWRoleCgEditor.roleEditor_skydow_1"
                              , s = i && i.getCustomRole(a, t.slot) ? c("roleEditor.btn.buySlotAgain") : c("roleEditor.btn.buySlot");
                            return this.loadSteamCurrency().then(( () => this.queryItemPrice(o))).then((t => {
                                let i = `\n\t\t\t\t\t<img src="${e.Base.getAppResourceFileUrl("Server.gltDollar")}" />\n\t\t\t\t\t<span style="margin-left:3px;">${S.formatAddComma(t.price)}</span>\n\t\t\t\t`;
                                if (j()) {
                                    const a = this.state.steamCurrency
                                      , o = D.gltDollarToSteamPrice(t.price, a);
                                    i = `\n\t\t\t\t\t\t<img src="${e.Base.getAppResourceFileUrl("Server.steam_coin")}" />\n\t\t\t\t\t\t<span style="margin:0 6px 0 3px;">${S.formatAddComma(o)}</span>\n\t\t\t\t\t\t<span style="font-size:13px;color:#777;padding-top:4px;">${a}</span>\n\t\t\t\t\t`
                                }
                                let a = `\n\t\t\t\t\t<div style="display:flex;align-items:center;background:#eee;padding:5px;margin: 15px auto 0;place-content:center;border-radius:3px;">\n\t\t\t\t\t\t<span style="margin-right:8px;color:#666">${c(t.buyAgain ? "roleEditor.labelBuyAgainPrice" : "roleEditor.labelBuyPrice")}</span>\n\t\t\t\t\t\t${i}\n\t\t\t\t\t</div>\n\t\t\t\t`
                                  , n = `\n\t\t\t\t\t<div style="margin-top:12px;">${this.getBtnSaveTooltip()}</div>\n\t\t\t\t\t${a}\n\t\t\t\t`;
                                return new Promise((t => {
                                    e.ReactMaterial.dialogs.openConfirmDialog({
                                        confirmIcon: "shopping_cart",
                                        confirmLabel: s,
                                        cancelLabel: c("tw.button.forgetIt"),
                                        message: n,
                                        messageType: "html",
                                        onConfirm: () => {
                                            this.state.ingame;
                                            e.GLT.components.showLoading(),
                                            e.GLT.commands.itemService.listGameItemsByCodes([o], (i => {
                                                e.Server.components.showItemCheckout(i[0], null, {
                                                    onClose: () => {
                                                        t()
                                                    }
                                                })
                                            }
                                            ), (i => {
                                                e.GLT.components.showAlert(c("tw.error.title"), i, c("tw.button.close")),
                                                t()
                                            }
                                            )).submit().then(( () => {
                                                e.GLT.components.hideLoading()
                                            }
                                            ))
                                        }
                                    })
                                }
                                ))
                            }
                            ))
                        }
                        refreshSlotLock() {
                            let t = this.state.ingame;
                            return e.GLT.components.showLoading(),
                            C.roleManager.listAvailableSlotItems(t.role.defaultRole.defaultCamp).then((e => {
                                t = this.state.ingame;
                                let i = e.find((e => e.slot == t.slot));
                                t.item = i && i.item,
                                this.setState({
                                    ingame: t
                                }),
                                this.emitEditItem(t.item)
                            }
                            )).catch((t => e.GLT.components.showAlert(c("tw.error.title"), t, c("tw.button.close")))).then(( () => e.GLT.components.hideLoading()))
                        }
                        emitEditItem(e) {
                            this.props.emitter.emit("editItem", e)
                        }
                        getBtnSaveTooltip() {
                            if (this.isLocked()) {
                                const e = this.state.ingame
                                  , t = e.role.defaultRole.defaultCamp;
                                return C.roleManager.getCustomRole(t, e.slot) ? c("roleEditor.requireItemToSaveAgain") : c("roleEditor.requireItemToSave")
                            }
                            return ""
                        }
                        isLocked() {
                            const e = this.state.ingame;
                            return e && !e.item
                        }
                        parseRangeString(str) {
                            return parseRoleEditorRangeString(str)
                        }

                        onSelectModalConfirm() { 
                            const rangeStr = this.state.selectInputValue;
                            const targetLayers = this.parseRangeString(rangeStr);
                            
                            if (targetLayers.length > 0) {
                                const allItems = this.decoManager.items || [];
                                const itemsToSelect = [];
                                
                                allItems.forEach(item => {
                                    const layerNum = this.getDecoLayerNumber(item);
                                    if (targetLayers.includes(layerNum)) {
                                        itemsToSelect.push(item);
                                    }
                                });
                                
                                this.decoManager.selectDecos(itemsToSelect);
                            }
                            
                            this.setState({ isSelectModalOpen: false });
                        }

                        btnSelect() {
                            this.setState({ isSelectModalOpen: true, selectInputValue: "" });
                        }
                        btnInsert() {
                            this.openInsertModal()
                        }
                        renderInsertModal() {
                            const e = this.state.insertDraftScopes || this.getDefaultInsertPrefs().scopes
                              , t = this.state.insertDraftPlacement || "top"
                              , i = this.isValidInsertIndexValue(this.state.insertDraftIndex)
                              , a = "after_index" !== t || i;
                            return React.createElement(MaterialUI.Dialog, {
                                open: !!this.state.insertDialogOpen,
                                onClose: () => this.setState({ insertDialogOpen: false }),
                                fullWidth: true,
                                maxWidth: "sm"
                            }, React.createElement(MaterialUI.DialogTitle, null, "Insert Settings"), React.createElement(MaterialUI.DialogContent, {
                                dividers: true
                            }, React.createElement("div", {
                                style: {
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 16,
                                    minWidth: 320
                                }
                            }, React.createElement(MaterialUI.Typography, {
                                variant: "subtitle1"
                            }, "Insert target"), React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Radio, {
                                    checked: "top" === t,
                                    onChange: () => this.setState({ insertDraftPlacement: "top" }),
                                    color: "primary"
                                }),
                                label: "List Top"
                            }), React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Radio, {
                                    checked: "bottom" === t,
                                    onChange: () => this.setState({ insertDraftPlacement: "bottom" }),
                                    color: "primary"
                                }),
                                label: "List Bottom"
                            }), React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Radio, {
                                    checked: "after_index" === t,
                                    onChange: () => this.setState({ insertDraftPlacement: "after_index" }),
                                    color: "primary"
                                }),
                                label: "Below Index"
                            }), React.createElement(MaterialUI.TextField, {
                                label: "Visible row number (1-based)",
                                type: "number",
                                fullWidth: true,
                                value: this.state.insertDraftIndex,
                                disabled: "after_index" !== t,
                                error: "after_index" === t && !i,
                                helperText: "after_index" === t ? i ? "New items will be inserted below this visible row." : "Please enter an integer >= 1." : "Enable \"Below Index\" to edit this value.",
                                inputProps: {
                                    min: 1,
                                    step: 1
                                },
                                onChange: e => this.setState({ insertDraftIndex: e.target.value }),
                                onKeyDown: e => {
                                    e.stopPropagation(),
                                    "Enter" === e.key && a && this.onInsertModalConfirm()
                                }
                            }), React.createElement(MaterialUI.Typography, {
                                variant: "subtitle1"
                            }, "Affect create sources"), React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: !!e.palette,
                                    onChange: () => this.setState({
                                        insertDraftScopes: Object.assign({}, e, {
                                            palette: !e.palette
                                        })
                                    }),
                                    color: "primary"
                                }),
                                label: "\u5de6\u5074\u7d20\u6750\u9ede\u64ca\u65b0\u589e"
                            }), React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: !!e.copy,
                                    onChange: () => this.setState({
                                        insertDraftScopes: Object.assign({}, e, {
                                            copy: !e.copy
                                        })
                                    }),
                                    color: "primary"
                                }),
                                label: "\u8907\u88fd/\u8cbc\u4E0A\u8207\u93E1\u50CF\u8907\u88FD"
                            }), React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: !!e.mergeBatch,
                                    onChange: () => this.setState({
                                        insertDraftScopes: Object.assign({}, e, {
                                            mergeBatch: !e.mergeBatch
                                        })
                                    }),
                                    color: "primary"
                                }),
                                label: "Merge / Batch Add"
                            }))), React.createElement(MaterialUI.DialogActions, null, React.createElement(MaterialUI.Button, {
                                onClick: () => this.setState({ insertDialogOpen: false }),
                                color: "primary"
                            }, "Cancel"), React.createElement(MaterialUI.Button, {
                                onClick: () => this.onInsertModalConfirm(),
                                color: "primary",
                                disabled: !a
                            }, "Save")))
                        }

                        renderSelectModal() {
                             return React.createElement(MaterialUI.Dialog, {
                                open: !!this.state.isSelectModalOpen,
                                onClose: () => this.setState({ isSelectModalOpen: false })
                            }, 
                                React.createElement(MaterialUI.DialogTitle, null, "Select Items"),
                                React.createElement(MaterialUI.DialogContent, null, 
                                    React.createElement(MaterialUI.TextField, {
                                        autoFocus: true,
                                        margin: "dense",
                                        label: "Item Numbers (e.g. 1,2,3 or 1-5)",
                                        fullWidth: true,
                                        value: this.state.selectInputValue || "",
                                        onChange: (e) => this.setState({ selectInputValue: e.target.value }),
                                        onKeyDown: (e) => {
                                            e.stopPropagation(); 
                                            if (e.key === 'Enter') this.onSelectModalConfirm(); 
                                        }
                                    }),
                                    React.createElement(MaterialUI.DialogContentText, { style: { marginTop: 10, fontSize: '0.8em' } }, 
                                        "輸入以逗號分隔的圖層編號或範圍（例如 1-5,8,9）。"
                                    )
                                ),
                                React.createElement(MaterialUI.DialogActions, null, 
                                    React.createElement(MaterialUI.Button, {
                                        onClick: () => this.setState({ isSelectModalOpen: false }),
                                        color: "primary"
                                    }, "Cancel"),
                                    React.createElement(MaterialUI.Button, {
                                        onClick: () => this.onSelectModalConfirm(),
                                        color: "primary"
                                    }, "Select")
                                )
                            );
                        }

                        // 新增：Range 設定對話框（直列顯示、開關、數值、無限、驗證提示）
                        renderSettingModal() {
                            const minRange = 60;
                            const { rangeDialogOpen, rangeVisible, rangeValue, rangeInfinite, rangeError } = this.state;

                            const valueDisplay = rangeInfinite ? "∞" : (isFinite(rangeValue) && rangeValue !== null ? String(rangeValue) : "(not set)");

                            return React.createElement(MaterialUI.Dialog, {
                                open: !!rangeDialogOpen,
                                onClose: () => this.setState({ rangeDialogOpen: false, rangeError: null })
                            },
                                React.createElement(MaterialUI.DialogTitle, null, "Range Settings"),
                                React.createElement(MaterialUI.DialogContent, null,
                                    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12, minWidth: 320 } },

                                        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                                            React.createElement(MaterialUI.Typography, { variant: "subtitle1" }, "Show Range Line"),
                                            React.createElement(MaterialUI.Switch, {
                                                checked: !!rangeVisible,
                                                onChange: () => this.setState({ rangeVisible: !rangeVisible }),
                                                color: "primary"
                                            })
                                        ),

                                        React.createElement("div", null,
                                            React.createElement(MaterialUI.Typography, { variant: "subtitle1", style: { marginBottom: 6 } }, "Range (>= 60)"),
                                            React.createElement(MaterialUI.TextField, {
                                                fullWidth: true,
                                                variant: "outlined",
                                                type: "number",
                                                value: rangeValue === null ? "" : rangeValue,
                                                onChange: (e) => {
                                                    let v = e.target.value === "" ? "" : Number(e.target.value);
                                                    if (v !== "" && (isNaN(v) || v < minRange)) {
                                                        this.setState({ rangeValue: v, rangeError: `Minimum is ${minRange}` });
                                                    } else {
                                                        this.setState({ rangeValue: v === "" ? null : v, rangeError: null });
                                                    }
                                                },
                                                disabled: !!rangeInfinite,
                                                helperText: rangeError || `Current applied: ${valueDisplay}`
                                            })
                                        ),

                                        React.createElement(MaterialUI.FormControlLabel, {
                                            control: React.createElement(MaterialUI.Checkbox, {
                                                checked: !!rangeInfinite,
                                                onChange: () => this.setState({ rangeInfinite: !rangeInfinite, rangeError: null })
                                            }),
                                            label: "Infinite"
                                        })
                                    )
                                          ),
                                React.createElement(MaterialUI.DialogActions, null,
                                    React.createElement(MaterialUI.Button, {
                                        onClick: () => this.setState({ rangeDialogOpen: false, rangeError: null }),
                                        color: "primary"
                                    }, "Cancel"),
                                    React.createElement(MaterialUI.Button, {
                                        onClick: () => {
                                            // Validate
                                            if (!this.state.rangeInfinite) {
                                                const v = Number(this.state.rangeValue);
                                                if (!isFinite(v) || isNaN(v) || v < minRange) {
                                                    this.setState({ rangeError: `Please enter a number >= ${minRange}` });
                                                    return;
                                                }
                                            }

                                            let value = this.state.rangeInfinite ? Infinity : Math.max(minRange, Number(this.state.rangeValue) || minRange);
                                            const decoCtrl = this.decoManager.decoController;
                                            if (this.decoManager) this.decoManager.positionRange = value;
                                            if (decoCtrl) decoCtrl.positionRange = value;

                                            // Close and clear error
                                            this.setState({ rangeDialogOpen: false, rangeValue: this.state.rangeInfinite ? null : value, rangeVisible: !!this.state.rangeVisible, rangeInfinite: !!this.state.rangeInfinite, rangeError: null });
                                        },
                                        color: "primary"
                                    }, "OK")
                                )
                            );
                        }
                        renderHotkeyModal() {
                            const shortcuts = [
                                { key: "Ctrl + Z", desc: "\u5FA9\u539F" },
                                { key: "Ctrl + Y", desc: "\u91CD\u505A" },
                                { key: "Ctrl + C", desc: "\u8907\u88FD\u9078\u53D6\u7269\u4EF6" },
                                { key: "Ctrl + V", desc: "\u8CBC\u4E0A\u5DF2\u8907\u88FD\u7269\u4EF6" },
                                { key: "Ctrl + A", desc: "\u5168\u9078\u7269\u4EF6\uff08\u4E0D\u542B\u982D\u90E8\uff09" },
                                { key: "Ctrl + G", desc: "\u5C07\u9078\u53D6\u7269\u4EF6\u5EFA\u7ACB\u7FA4\u7D44" },
                                { key: "Ctrl + Shift + ]", desc: "\u5C07\u9078\u53D6\u7269\u4EF6\u79FB\u5230\u6700\u4E0A\u5C64" },
                                { key: "Ctrl + Shift + [", desc: "\u5C07\u9078\u53D6\u7269\u4EF6\u79FB\u5230\u6700\u4E0B\u5C64" },
                                { key: "W / \u2191", desc: "\u5411\u4E0A\u79FB\u52D5\u9078\u53D6\u7269\u4EF6" },
                                { key: "S / \u2193", desc: "\u5411\u4E0B\u79FB\u52D5\u9078\u53D6\u7269\u4EF6" },
                                { key: "A / \u2190", desc: "\u5411\u5DE6\u79FB\u52D5\u9078\u53D6\u7269\u4EF6" },
                                { key: "D / \u2192", desc: "\u5411\u53F3\u79FB\u52D5\u9078\u53D6\u7269\u4EF6" },
                                { key: "C", desc: "\u9806\u6642\u91DD\u65CB\u8F49\u9078\u53D6\u7269\u4EF6" },
                                { key: "V", desc: "\u9006\u6642\u91DD\u65CB\u8F49\u9078\u53D6\u7269\u4EF6" },
                                { key: "Z", desc: "\u653E\u5927\u9078\u53D6\u7269\u4EF6" },
                                { key: "X", desc: "\u7E2E\u5C0F\u9078\u53D6\u7269\u4EF6" },
                                { key: "Shift + Z", desc: "\u589E\u52A0\u9577\u5BEC\u6BD4" },
                                { key: "Shift + X", desc: "\u964D\u4F4E\u9577\u5BEC\u6BD4" },
                                { key: "Delete / Backspace", desc: "\u522A\u9664\u9078\u53D6\u7269\u4EF6" }
                            ];
                            return React.createElement(MaterialUI.Dialog, {
                                open: !!this.state.hotkeyDialogOpen,
                                onClose: () => this.setState({ hotkeyDialogOpen: false }),
                                fullWidth: true,
                                maxWidth: "sm"
                            },
                                React.createElement(MaterialUI.DialogTitle, null, "\u5FEB\u6377\u9375\u8AAA\u660E"),
                                React.createElement(MaterialUI.DialogContent, {
                                    dividers: true,
                                    style: {
                                        maxHeight: "min(520px, calc(100vh - 180px))",
                                        overflowY: "auto"
                                    }
                                },
                                    React.createElement(MaterialUI.DialogContentText, {
                                        style: { marginBottom: 8 }
                                    }, "\u4EE5\u4E0B\u70BA\u89D2\u8272\u7DE8\u8F2F\u5668\u5E38\u7528\u5FEB\u6377\u9375\uff1A"),
                                    React.createElement(MaterialUI.Typography, {
                                        variant: "caption",
                                        style: {
                                            display: "block",
                                            marginBottom: 12,
                                            opacity: .75
                                        }
                                    }, "\u53EF\u5411\u4E0B\u6372\u52D5\u67E5\u770B\u5B8C\u6574\u6E05\u55AE\u3002"),
                                    React.createElement("div", {
                                        style: {
                                            width: "100%",
                                            minWidth: 0,
                                            paddingRight: 6,
                                            boxSizing: "border-box"
                                        }
                                    }, shortcuts.map((item, idx) => React.createElement("div", {
                                        key: item.key + "_" + idx,
                                        style: {
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 16,
                                            padding: "6px 0",
                                            borderBottom: idx === shortcuts.length - 1 ? "none" : "1px solid rgba(255,255,255,.12)"
                                        }
                                    }, React.createElement(MaterialUI.Typography, {
                                        variant: "body2",
                                        style: { fontFamily: "monospace", fontWeight: 600, minWidth: 150 }
                                    }, item.key), React.createElement(MaterialUI.Typography, {
                                        variant: "body2",
                                        style: { flex: 1 }
                                    }, item.desc))))
                                ),
                                React.createElement(MaterialUI.DialogActions, null,
                                    React.createElement(MaterialUI.Button, {
                                        onClick: () => this.setState({ hotkeyDialogOpen: false }),
                                        color: "primary"
                                    }, "\u95DC\u9589")
                                )
                            );
                        }
                        renderSaveButtons() {
                            return "ingameEditor" == this.props.appUsage.usage ? React.createElement("div", {
                                className: "btns"
                            }, React.createElement(MaterialUI.Tooltip, {
                                title: this.getBtnSaveTooltip()
                            }, React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                color: "inherit",
                                className: this.isLocked() ? "locked" : "",
                                endIcon: React.createElement(MaterialUI.Icon, null, "save"),
                                onClick: this.btnSave
                            }, c("roleEditor.btn.saveRole"))), React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                className: "btn-save-more",
                                color: "inherit",
                                "aria-controls": "save-menu",
                                "aria-haspopup": "true",
                                onClick: this.btnSaveMore
                            }, React.createElement(MaterialUI.Icon, null, "more_vert")), React.createElement(MaterialUI.Menu, {
                                id: "save-menu",
                                anchorEl: this.state.saveMoreAnchor,
                                open: Boolean(this.state.saveMoreAnchor),
                                onClose: this.closeSaveMore
                            }, React.createElement(MaterialUI.MenuItem, {
                                onClick: this.btnSave,
                                className: this.isLocked() ? "locked" : "",
                                disabled: this.isLocked()
                            }, React.createElement(MaterialUI.Icon, null, "save"), c("roleEditor.btn.saveRole")), React.createElement(MaterialUI.MenuItem, {
                                onClick: this.btnDownload
                            }, React.createElement(MaterialUI.Icon, null, "download"), c("roleEditor.btn.downloadRole")))) : React.createElement("div", {
                                className: "btns"
                            }, React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                color: "inherit",
                                endIcon: React.createElement(MaterialUI.Icon, null, "download"),
                                onClick: this.btnDownload
                            }, c("roleEditor.btn.downloadRole")) ,
                            React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                color: "inherit",
                                endIcon: React.createElement(MaterialUI.Icon, null, "merge_type"), // Merge icon
                                onClick: this.btnMerge,
                                style: { marginLeft: 10 }
                            }, "Merge"), // 按鈕文字
                            React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                color: "inherit",
                                endIcon: React.createElement(MaterialUI.Icon, null, "check_box"),
                                onClick: () => this.btnSelect(),
                                style: { marginLeft: 10 }
                            }, "Select"),
                            React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                color: "inherit",
                                endIcon: React.createElement(MaterialUI.Icon, null, "playlist_add"),
                                onClick: () => this.btnInsert(),
                                style: { marginLeft: 10 }
                            }, "Insert"),
                            React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                color: "inherit",
                                endIcon: React.createElement(MaterialUI.Icon, null, "settings"),
                                onClick: () => this.setState({ rangeDialogOpen: true }),
                                style: { marginLeft: 10 }
                            }, "Setting"),
                            React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                color: "inherit",
                                endIcon: React.createElement(MaterialUI.Icon, null, "message"),
                                onClick: () => this.setState({ hotkeyDialogOpen: true }),
                                style: { marginLeft: 10 }
                            }, "\u5FEB\u6377\u9375"),
                         /*   React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                color: "inherit",
                                endIcon: React.createElement(MaterialUI.Icon, null, "image"),
                                onClick: this.btnDownloadAllImages,
                                style: { marginLeft: 10 }
                            }, "All PNG"),*/
                            this.renderSelectModal(),
                            this.renderInsertModal(),
                            this.renderSettingModal(),
                            this.renderHotkeyModal()
                        )
                        }
                        render() {
                            const e = this.props.classes,
                                t = this.state,
                                i = t.selectedDecos,
                                a = !i.length || i.find((e => e.isHead())),
                                o = this.decoManager.decoController,
                                p = (this.decoManager && typeof this.decoManager.positionRange === 'number') ? this.decoManager.positionRange : 60,
                                d = "number" == typeof t.editValues.posX ? Math.round(100 * t.editValues.posX) / 100 : 0,
                                h = "number" == typeof t.editValues.posY ? Math.round(100 * t.editValues.posY) / 100 : 0,
                                browserZoomRatio = this.baseDevicePixelRatio ? (window.devicePixelRatio || 1) / this.baseDevicePixelRatio : 1,
                                stageBgTop = .2 * t.stageScale * browserZoomRatio * 100 + "%";
                            
                            return React.createElement("div", {
                                className: e.bg
                            }, React.createElement("div", {
                                className: e.window
                            }, React.createElement("div", {
                                className: "windowTitle"
                            }, c("roleEditor.title")), React.createElement("div", {
                                className: "menuBar"
                            }, React.createElement("div", {
                                className: "btns"
                            }, React.createElement("input", {
                                ref: this.fileInputRef,
                                type: "file",
                                style: {
                                    display: "none"
                                },
                                accept: ".twrole",
                                onChange: this.onFileSelected
                            }),
                            React.createElement("input", { 
                                ref: this.mergeFileInputRef, 
                                type: "file", 
                                style: { display: "none" }, 
                                accept: ".twrole", 
                                onChange: this.onMergeFileSelected 
                            }),React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                color: "inherit",
                                endIcon: React.createElement(MaterialUI.Icon, null, "upload_file"),
                                onClick: this.btnImport
                            }, c("roleEditor.btn.importRole"))), this.renderSaveButtons(), React.createElement("div", {
                                className: "does-btns"
                            }, React.createElement(MaterialUI.Tooltip, {
                                title: "Undo (Ctrl + Z)"
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.goHistory(-1)
                            }, React.createElement(MaterialUI.Icon, null, "undo"))), React.createElement(MaterialUI.Tooltip, {
                                title: "Redo (Ctrl + Y)"
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.goHistory(1)
                            }, React.createElement(MaterialUI.Icon, null, "redo")))), React.createElement("div", {
                                className: "spacer"
                            }), React.createElement(MaterialUI.Select, {
                                className: "dropdown camps",
                                color: "secondary",
                                disabled: this.isInGameEditor(),
                                value: t.selectedCamp.code,
                                onChange: this.onCampSelected
                            }, f.listAll().map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e.code,
                                value: e.code
                            }, e.nameFull)))), React.createElement(MaterialUI.Select, {
                                className: "dropdown genders",
                                color: "secondary",
                                value: t.selectedGender.code,
                                onChange: this.onGenderSelected
                            }, O.map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e.code,
                                value: e.code
                            }, e.name))))), React.createElement("div", {
                                className: "topBar"
                            }, L.map((e => React.createElement("div", {
                                className: "topBarButton button " + (e == this.state.currTab ? "selected" : ""),
                                key: e.code,
                                onClick: () => this.onBtnTab(e)
                            }, c("roleEditor.tab." + e.code))))), React.createElement("div", {
                                className: "bottomBody"
                            }, React.createElement("div", {
                                className: e.choiceList,
                                ref: this.choiceListRef
                            }, (() => {
                                const tabs = L.map(e => this.renderPartList(e));
                                // 如果當前標籤正在使用虛擬列表，讓 React 回傳 null 以完全釋放子節點管理權
                                if (this.state.currTab && this.state.currTab.options && !this.state.currTab.loading) {
                                    return null;
                                }
                                return tabs;
                            })()), React.createElement("div", {
                                className: e.editBlock
                            }, React.createElement("div", {
                                ref: this.stageBgRef,
                                className: e.stageBg,
                                style: {
                                    top: stageBgTop,
                                    transform: `translate(-50%, -50%) rotate(90deg) scale(${t.stageScale})`
                                }
                            }, React.createElement("div", {
                                className: "piece"
                            }), React.createElement("div", {
                                className: "piece piece2"
                            }), t.rangeVisible ? React.createElement("div", {
                                className: "range-line",
                                style: {
                                    position: "absolute",
                                    left: "50%",
                                    top: "50%",
                                    transform: "translate(-50%,-50%)",
                                    width: (t.rangeInfinite ? 20000 : (Number(t.rangeValue) || 60) * 2) + "px",
                                    height: (t.rangeInfinite ? 20000 : (Number(t.rangeValue) || 60) * 2) + "px",
                                    border: "2px dashed rgba(255,215,0,0.9)",
                                    borderRadius: "50%",
                                    pointerEvents: "none",
                                    boxSizing: "border-box",
                                    zIndex: 1
                                }
                            }) : null), React.createElement("div", {
                                className: e.stage,
                                ref: this.stageRef
                            }), React.createElement("div", {
                                className: "editFunction" + (a ? " disabled" : "")
                            }, React.createElement("div", {
                                className: "tool"
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: this.cancelSelectedDeco,
                                disabled: !i.length
                            }, React.createElement(MaterialUI.Icon, null, "touch_app")), React.createElement(MaterialUI.IconButton, {
                                onClick: this.flipSelectedDeco,
                                disabled: a
                            }, React.createElement(MaterialUI.Icon, null, "flip")), 
                            
                            /* --- 新增：左右鏡像複製按鈕 (Horizontal) --- */
                            React.createElement(MaterialUI.Tooltip, {
                                title: "Mirror Copy Horizontal (左右鏡像)",
                                placement: "top"
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.mirrorCopySelectedDeco('horizontal'),
                                disabled: !i.length || a
                            }, React.createElement(MaterialUI.Icon, null, "swap_horiz"))),
                        
                            /* --- 新增：上下鏡像複製按鈕 (Vertical) --- */
                            React.createElement(MaterialUI.Tooltip, {
                                title: "Mirror Copy Vertical (上下鏡像)",
                                placement: "top"
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.mirrorCopySelectedDeco('vertical'),
                                disabled: !i.length || a
                            }, React.createElement(MaterialUI.Icon, null, "swap_vert"))),
                        
                            React.createElement(MaterialUI.IconButton, {
                                disabled: this.stageMaxScale <= t.editValues.stageScale.x,
                                onClick: this.zoomInStage
                            }, React.createElement(MaterialUI.Icon, null, "zoom_in")), React.createElement(MaterialUI.IconButton, {
                                disabled: this.stageMinScale >= t.editValues.stageScale.x,
                                onClick: this.zoomOutStage
                            }, React.createElement(MaterialUI.Icon, null, "zoom_out")), React.createElement(MaterialUI.IconButton, {
                                style: {
                                    transform: `rotate(${t.facing - 90}deg)`
                                },
                                onClick: this.btnActorFacing
                            }, React.createElement(MaterialUI.Icon, null, "face")), React.createElement(MaterialUI.Tooltip, {
                                title: a ? "" : "Set position",
                                placement: "left"
                            }, React.createElement("div", {
                                className: "rangeBox positionBox"
                            }, React.createElement(MaterialUI.TextField, {
                                label: "X",
                                type: "number",
                                variant: "outlined",
                                size: "small",
                                disabled: a,
                                value: d,
                                inputProps: {
                                    step: 0.01,
                                    min: isFinite(p) ? -p : -10000,
                                    max: isFinite(p) ? p : 10000
                                },
                                style: {
                                    userSelect: "none",        // 禁止選取
                                    MozUserSelect: "none",     // Firefox 兼容
                                    WebkitUserSelect: "none",  // Chrome/Safari 兼容
                                    cursor: "default",          // 如果你不希望游標變成輸入圖示，可以加這行
                                    marginLeft: 8,
                                    marginRight: 8,
                                    width: 80
                                },
                                InputProps: {
                                    style: {
                                        color: "#fff",
                                        backgroundColor: "rgba(255,255,255,.15)",
                                        borderRadius: 4
                                    }
                                },
                                InputLabelProps: {
                                    style: {
                                        color: "#bbb"
                                    }
                                },
                                onChange: e => this.onPositionInputChange("x", e),
                                onBlur: () => this.onPositionInputBlur(),
                                onKeyUp: e => this.onPositionInputKeyUp(e)
                            }), React.createElement(MaterialUI.TextField, {
                                label: "Y",
                                type: "number",
                                variant: "outlined",
                                size: "small",
                                disabled: a,
                                value: h,
                                inputProps: {
                                    step: 0.01,
                                    min: isFinite(p) ? -p : -10000,
                                    max: isFinite(p) ? p : 10000
                                },
                                style: {
                                    userSelect: "none",        // 禁止選取
                                    MozUserSelect: "none",     // Firefox 兼容
                                    WebkitUserSelect: "none",  // Chrome/Safari 兼容
                                    cursor: "default",     
                                    marginLeft: 8,
                                    width: 80
                                },
                                InputProps: {
                                    style: {
                                        color: "#fff",
                                        backgroundColor: "rgba(255,255,255,.15)",
                                        borderRadius: 4
                                    }
                                },
                                InputLabelProps: {
                                    style: {
                                        color: "#bbb"
                                    }
                                },
                                onChange: e => this.onPositionInputChange("y", e),
                                onBlur: () => this.onPositionInputBlur(),
                                onKeyUp: e => this.onPositionInputKeyUp(e)
                            })))), React.createElement("div", {
                                className: "rangeRoot"
                            }, React.createElement(MaterialUI.Tooltip, {
                                title: a ? "" : c("roleEditor.hotkey.rotate"),
                                placement: "left"
                            }, React.createElement("div", {
                                className: "rangeBox"
                            }, React.createElement(MaterialUI.Icon, {
                                className: "rangeIcon"
                            }, "rotate_left"), React.createElement("input", {
                                step: x.DecoConstant.ROTATE_STEP,
                                min: -180,
                                max: 180,
                                type: "range",
                                ref: this.rotateInputRef,
                                onMouseDown: this.onRangeInputStart,
                                onTouchStart: this.onRangeInputStart,
                                disabled: a,
                                value: t.editValues.rotate,
                                onChange: this.rotateSelectedDeco,
                                onMouseUp: this.releaseSliderFocus,
                                onTouchEnd: this.releaseSliderFocus
                            }), React.createElement("div", {
                                className: "btn-input-box",
                                onClick: () => !a && this.btnInputBoxRotate()
                            }, React.createElement(MaterialUI.Icon, null, "pin")), this.renderInputBox(t.rotateInputBox))), React.createElement(MaterialUI.Tooltip, {
                                title: a ? "" : c("roleEditor.hotkey.scale"),
                                placement: "left"
                            }, React.createElement("div", {
                                className: "rangeBox"
                            }, React.createElement(MaterialUI.Icon, {
                                className: "rangeIcon"
                            }, "zoom_out_map"), React.createElement("input", {
                                step: x.DecoConstant.SCALE_STEP,
                                type: "range",
                                ref: this.scaleInputRef,
                                onMouseDown: this.onRangeInputStart,
                                onTouchStart: this.onRangeInputStart,
                                min: o ? o.scaleRange.min : .001,
                                max: o ? o.scaleRange.max : 1,
                                disabled: a,
                                value: Math.abs(t.editValues.scaleX),
                                onChange: this.scaleSelectedDeco,
                                onMouseUp: this.releaseSliderFocus,
                                onTouchEnd: this.releaseSliderFocus
                            }), React.createElement("div", {
                                className: "btn-input-box",
                                onClick: () => !a && this.btnInputBoxScale()
                            }, React.createElement(MaterialUI.Icon, null, "pin")), this.renderInputBox(t.scaleInputBox))), React.createElement(MaterialUI.Tooltip, {
                                title: a ? "" : c("roleEditor.hotkey.ratio"),
                                placement: "left"
                            }, React.createElement("div", {
                                className: "rangeBox"
                            }, React.createElement(MaterialUI.Icon, {
                                className: "rangeIcon"
                            }, "height"), React.createElement("input", {
                                step: x.DecoConstant.SCALE_RATIO_STEP,
                                type: "range",
                                ref: this.ratioInputRef,
                                onMouseDown: this.onRangeInputStart,
                                onTouchStart: this.onRangeInputStart,
                                min: x.DecoConstant.SCALE_RATIO_MIN,
                                max: x.DecoConstant.SCALE_RATIO_MAX,
                                disabled: a,
                                value: Math.abs(t.editValues.scaleY / t.editValues.scaleX),
                                onChange: this.ratioSelectedDeco,
                                onMouseUp: this.releaseSliderFocus,
                                onTouchEnd: this.releaseSliderFocus
                            }), React.createElement("div", {
                                className: "btn-input-box",
                                onClick: () => !a && this.btnInputBoxRatio()
                            }, React.createElement(MaterialUI.Icon, null, "pin")), this.renderInputBox(t.ratioInputBox)))))), React.createElement("div", {
                                className: e.editList,
                                ref: this.editListRef,
                                onScroll: (e) => {
                                    if (e.target) {
                                        // FIX: During settling after drop, ignore scroll events
                                        if (this.isSettling) {
                                            return;
                                        }
                                        
                                        const newTop = e.target.scrollTop;
                                        const currentTop = this.state.scrollTop || 0;
                                        
                                        // FIX: Reduced threshold to prevent large desync between state and DOM
                                        const threshold = this.localDragState ? 100 : 20;

                                        // 1. Glitch protection (Jump to 0)
                                        if (newTop === 0 && currentTop > 500) {
                                            if (e.target.scrollHeight > e.target.clientHeight * 2) {
                                                e.target.scrollTop = currentTop;
                                                return;
                                            }
                                        }

                                        // 2. Threshold update
                                        if (Math.abs(newTop - currentTop) > threshold) {
                                            this.setState({ scrollTop: newTop });
                                            
                                            // Re-enable top spacer only when scrolled back to top
                                            // This reduces DOM count while avoiding scroll jump issues
                                            if (!this.localDragState && !this.topSpacerSafe && newTop < 500) {
                                                this.topSpacerSafe = true;
                                                this.setState({
                                                    layoutVersion: (this.state.layoutVersion || 0) + 1
                                                });
                                            }
                                        }
                                    }
                                }
                            }, this.renderLayerList(), React.createElement("div", {
                                className: "spacerBlock",
                                style: { flex: 1, minHeight: "50px" },
                                onClick: () => this.decoManager.selectDecos([])
                            }), React.createElement("div", {
                                className: "paddingBlock"
                            }), React.createElement("div", {
                                className: "right-resizer",
                                onMouseDown: this.onRightResizeStart,
                                onTouchStart: this.onRightResizeStart
                            })))))
                        }
                        renderInputBox(e) {
                            if (e)
                                return React.createElement("div", {
                                    className: "input-box"
                                }, React.createElement(MaterialUI.TextField, {
                                    type: "number",
                                    variant: "outlined",
                                    inputProps: {
                                        maxLength: 10,
                                        step: e.step,
                                        min: e.min,
                                        max: e.max
                                    },
                                    autoFocus: !0,
                                    value: e.value,
                                    onChange: t => this.onInputBoxChange(t, e),
                                    onKeyUp: t => this.onInputBoxDone(t, e),
                                    onBlur: () => this.onInputBoxBlur(e)
                                }))
                        }
                        onInputBoxChange(e, t) {
                            let i = Number(e.target.value) || 0;
                            i = Math.max(t.min, Math.min(t.max, i)),
                            t.value = i;
                            let a = {};
                            if (a[t.key + "InputBox"] = t,
                            this.setState(a),
                            this.state.selectedDecos.length) {
                                let e = this.decoManager.decoController.container;
                                if ("ratio" == t.key)
                                    this.decoManager.decoController.setScale(e.scaleX, Math.abs(e.scaleX) * i);
                                else if ("scale" == t.key) {
                                    let t = e.scaleX > 0 ? 1 : -1
                                      , a = Math.abs(e.scaleY / e.scaleX);
                                    this.decoManager.decoController.setScale(i * t, i * a)
                                } else
                                    "rotate" == t.key && this.decoManager.decoController.setRotationDeg(i);
                                this.refreshEditValues(),
                                this.markHistoryDirty()
                            }
                        }
                        onInputBoxBlur(e) {
                            let t = {};
                            t[e.key + "InputBox"] = null,
                            this.setState(t),
                            this.state.selectedDecos && this.state.selectedDecos.length && this.commitHistoryMutation()
                        }
                        onInputBoxDone(e, t) {
                            ["Enter", "Escape"].includes(e.key) && this.onInputBoxBlur(t)
                        }
                    }
                    ,
                    t("RoleEditor", N),
                    H = !1
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/roleeditor/DecoManager", ["./DecoItem", "./DecoController"], (function(t, i) {
            "use strict";
            var a, o, s, n, r;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    s = e
                }
                ],
                execute: function() {
                    o = e.TwilightWarsLib.games.displays.roleDecos.RoleDeco,
                    n = e.Base.utils.ArrayUtil,
                    r = class e extends PIXI.utils.EventEmitter {
                        constructor(e, t) {
                            super(),
                            this.editor = e,
                            this.actorClip = t,
                            this.root = new PIXI.Container,
                            this.items = [],
                            this.positionRange = 60,
                            this.head = this.addDeco(o.HEAD_CODE),
                            this.head.clip.gotoAndStop(t.headClip.frame)
                        }
                        dispose() {
                            this.decoController && (this.decoController.dispose(),
                            this.decoController = null)
                        }
                        // 修改後的 importConfig：
                        importConfig(e) {
                            this.selectDecos([]),
                            n.removeElement(this.items, this.head),
                            this.items.forEach((e => e.dispose())),
                            this.items = [],
                            this.actorClip.leftFoot.setFrame(e.foot.f),
                            this.actorClip.rightFoot.setFrame(e.foot.f),
                            this.actorClip.leftHand.setFrame(e.hand.f, e.hand.s),
                            this.actorClip.rightHand.setFrame(e.hand.f, e.hand.s),
                            this.actorClip.capeClip.setFrame(e.cape.f, e.cape.s),
                            this.head.clip.gotoAndStop(e.head.f),
                            this.head.clip.scale.set(e.head.s),
                            this.head.clip.parent === this.root && this.root.removeChild(this.head.clip),
                            // --- 修改這裡 ---
                            e.decolist.forEach((e => {
                                if (e.code == o.HEAD_CODE) {
                                    this.root.addChild(this.head.clip);
                                    this.items.push(this.head);
                                } else {
                                    // 傳入 true 開啟靜音模式，不觸發 React 更新
                                    let t = this.addDeco(e.code, Number.MAX_SAFE_INTEGER, true); 
                                    
                                    t.clip.scale.copyFrom(e.scale);
                                    t.clip.rotation = e.rotation;
                                    t.clip.position.copyFrom(e.position);
                                }
                            }));
                            // 迴圈結束後，手動發送一次事件，更新介面
                            this.emit("decolist", this.items); // 修正：直接使用字串 "decolist"
                        }
                        addDeco(t, i = Number.MAX_SAFE_INTEGER, silent = false) { // 1. 加參數
                            i = Math.max(0, Math.min(this.items.length, i));
                            let o = new a.DecoItem(this, t);
                            this.items.splice(i, 0, o);
                            this.root.addChildAt(o.clip, i);
                            
                            // 2. 只有在不靜音的時候才發送事件
                            if (!silent) {
                                this.emit("decolist", this.items); // 改成字串 "decolist"
                            }
                            
                            return o;
                        }
                        setDecoIndex(t, i) {
                            if (!t || !t.clip)
                                return;
                            i = Math.max(0, Math.min(this.items.length, i));
                            let a = this.items.indexOf(t);
                            -1 != a && (i >= a && i--,
                            this.items.splice(a, 1)),
                            i = Math.max(0, Math.min(this.items.length, i)),
                            this.items.splice(i, 0, t),
                            t.clip.parent === this.root && this.root.removeChild(t.clip),
                            this.root.addChildAt(t.clip, Math.max(0, Math.min(this.root.children.length, i))),
                            this.emit(e.EVENT.DECOLIST, this.items)
                        }
                        removeDeco(t, i = false) {
                            if (!t || !t.clip)
                                return;
                            n.removeElement(this.items, t),
                            t.clip.parent === this.root && this.root.removeChild(t.clip),
                            i || this.emit(e.EVENT.DECOLIST, this.items)
                        }
                        removeDecos(t) {
                            const i = (t || []).filter((e => e && e.clip));
                            i.length && (i.forEach((e => this.removeDeco(e, !0))),
                            this.emit(e.EVENT.DECOLIST, this.items))
                        }
                        selectDecos(t) {
                            t = (t || []).filter((e => e && this.items.includes(e)));
                            return this.decoController && (this.decoController.dispose(),
                            this.decoController = null),
                            t.length ? (this.items.forEach((e => e.setInteractive(!1))),
                            this.decoController = new s.DecoController(this,t),
                            this.decoController.positionRange = this.positionRange) : this.items.forEach((e => e.setInteractive(!0))),
                            this.emit(e.EVENT.SELECT, t),
                            this.decoController
                        }
                        addSelectDeco(e) {
                            if (!this.decoController || this.decoController.hasHead() || e.isHead())
                                return this.selectDecos([e]);
                            {
                                let t = this.decoController.decos;
                                return t.includes(e) ? this.decoController : (t.push(e),
                                this.selectDecos(t))
                            }
                        }
                        getSelectedDecoIndexes() {
                            return this.decoController ? this.decoController.decos.map((e => this.items.indexOf(e))) : []
                        }
                        selectDecoIndex(e) {
                            let t = (e || []).map((e => this.items[e])).filter((e => !!e));
                            this.selectDecos(t)
                        }
                    }
                    ,
                    t("DecoManager", r),
                    r.EVENT = {
                        SELECT: "select",
                        DECOLIST: "decolist"
                    }
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/roleeditor/DecoItem", [], (function(t, i) {
            "use strict";
            var a;
            i && i.id,
            i && i.id;
            return {
                setters: [],
                execute: function() {
                    a = e.TwilightWarsLib.games.displays.roleDecos.RoleDeco,
                    t("DecoItem", class {
                        constructor(t, i) {
                            this.manager = t,
                            this.code = i,
                            i == a.HEAD_CODE ? this.clip = e.Base.resourceManager.createGAFMovieClip("TwilightWarsLib.actors", "lib_actor_head") : i && (this.clip = e.Base.resourceManager.createGAFMovieClip("TwilightWarsLib.role_decorations", this.code)),
                            this.clip && (this.clip.on("pointerover", this.onOver, this),
                            this.clip.on("pointerout", this.onOut, this),
                            this.clip.on("click", this.onClick, this),
                            this.clip.interactive = !1,
                            this.clip.cursor = "pointer")
                        }
                        dispose() {
                            this.clip && (this.clip.destroyed || this.clip.destroy())
                        }
                        setInteractive(e) {
                            this.clip && (this.clip.interactive = e,
                            this.clip.filters = null)
                        }
                        onClick() {
                            this.manager.selectDecos([])
                        }
                        onOver() {
                            this.clip && (this.clip.filters = [new PIXI.filters.GlowFilter({
                                color: 16777215,
                                distance: 3,
                                outerStrength: 3,
                                quality: 1
                            })])
                        }
                        onOut() {
                            this.clip && (this.clip.filters = null)
                        }
                        get minScale() {
                            return this.isHead() ? 1 : .001
                        }
                        get maxScale() {
                            return this.isHead() ? 2 : 1
                        }
                        get frame() {
                            return this.clip.currentFrame
                        }
                        isHead() {
                            return this.code == a.HEAD_CODE
                        }
                        exportRoleDeco() {
                            return new a(this.code,this.clip.x,this.clip.y,this.clip.scaleX,this.clip.scaleY,this.clip.rotation)
                        }
                    }
                    )
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/roleeditor/fixIngameRoleDesign", [], (function(t, i) {
            "use strict";
            var a, o, s, n;
            i && i.id,
            i && i.id;
            function r(e, t, i, a) {
                let s = e[t]
                  , n = o[t][i.code]
                  , r = a || n[0]
                  , l = !1;
                return s ? -1 == n.indexOf(s.f) && s.f != r && (s.f = a || n[0],
                l = !0) : (e[t] = {
                    f: r,
                    s: 1
                },
                l = !0),
                l
            }
            return t("fixIngameRoleDesign", (function(e, t) {
                let i = !1;
                if (e.defaultRole.defaultCamp != t) {
                    let o = e.defaultRole.female;
                    e.defaultRole = a.getDefault(t, o),
                    i = !0
                }
                if (e.usingCustomRole) {
                    let a = e.customRoleConfig;
                    i = r(a, "head", t) || i,
                    i = r(a, "cape", t, n.EMPTY_FRAME) || i,
                    i = r(a, "hand", t) || i,
                    i = r(a, "foot", t) || i;
                    let l = o.deco[t.code]
                      , c = a.decolist;
                    for (let e = c.length - 1; e >= 0; --e) {
                        let t = c[e];
                        -1 == l.indexOf(t.code) && t.code != s.HEAD_CODE && (c.splice(e, 1),
                        i = !0)
                    }
                }
                return i
            }
            )),
            {
                setters: [],
                execute: function() {
                    a = e.TwilightWarsLib.games.datas.RoleSet,
                    o = e.TwilightWarsLib.games.configs.RoleDecosList,
                    s = e.TwilightWarsLib.games.displays.roleDecos.RoleDeco,
                    n = e.TwilightWarsLib.games.displays.ActorCape
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/roleeditor/DecoConstant", [], (function(e, t) {
            "use strict";
            var i;
            t && t.id,
            t && t.id;
            return {
                setters: [],
                execute: function() {
                    e("DecoConstant", i = class {
                    }
                    ),
                    i.ROTATE_STEP = .25,
                    i.SCALE_RATIO_MIN = .001,
                    i.SCALE_RATIO_MAX = 2,
                    i.SCALE_RATIO_STEP = .01,
                    i.SCALE_STEP = .001
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/roleeditor/DecoController", ["./DecoItem", "./DecoConstant"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    n = e
                }
                ],
                execute: function() {
                    o = e.Base.pixis.interactive.DragControl,
                    s = e.Base.geom.Point,
                    r = e.Base.utils.RangedValue,
                    l = e.Base.utils.MathUtil,
                    c = c || new PIXI.filters.GlowFilter({
                        color: 10092441,
                        knockout: !0,
                        distance: 4,
                        outerStrength: 4,
                        quality: 1
                    }),
                    t("DecoController", class {
                        constructor(e, t) {
                            this.manager = e,
                            this.decos = t,
                            this.container = new PIXI.Container,
                            this.container.filters = [c],
                            this.clips = [],
                            this.positionRange = e.positionRange || 60,
                            this.changed = !1;
                            this.hitArea = new PIXI.Graphics,
                            this.hitArea.beginFill(0, .01),
                            this.hitArea.drawRect(-25, -25, 50, 50),
                            this.container.addChild(this.hitArea);
                            let i = new s;
                            if (1 == t.length) {
                                const e = t[0]
                                  , a = this.cloneDeco(e).clip;
                                this.container.addChild(a),
                                i.copyFrom(e.clip.position),
                                this.container.rotation = e.clip.rotation,
                                this.container.scale.copyFrom(e.clip.scale)
                            } else {
                                for (let e of t) {
                                    const t = this.cloneDeco(e).clip;
                                    t.position.copyFrom(e.clip.position),
                                    t.scale.copyFrom(e.clip.scale),
                                    t.rotation = e.clip.rotation,
                                    this.clips.push(t),
                                    this.container.addChild(t),
                                    i.x += e.clip.x,
                                    i.y += e.clip.y
                                }
                                i.scale(1 / t.length)
                            }
                            for (let e of this.clips)
                                e.x -= i.x,
                                e.y -= i.y;
                            this.container.interactive = !0,
                            this.container.position.copyFrom(i),
                            e && e.root && !e.root.destroyed && e.root.addChild(this.container),
                            this.hasHead() || (this.container.cursor = "pointer",
                            this.dragControl = new o(this.container),
                            this.dragControl.shiftLock = !0,
                            this.dragControl.on(o.EVENT.DRAG_START, this.onDragStart, this),
                            this.dragControl.on(o.EVENT.DRAG_MOVE, this.onDragMove, this),
                            this.dragControl.on(o.EVENT.DRAG_END, this.onDragEnd, this)),
                            this.scaleRange = new r(this._getMinScale(),this._getMaxScale()),
                            this.ratioRange = new r(this._getMinRatio(),this._getMaxRatio())
                        }
                        cloneDeco(e) {
                            const t = new a.DecoItem(this.manager,e.code);
                            return t
                        }
                        hasHead() {
                            return !!this.decos.find((e => e.isHead()))
                        }
                        dispose() {
                            this.dragControl && this.dragControl.dispose(),
                            this.dragControl = null;
                            for (let e of this.clips)
                                e && !e.destroyed && e.destroy();
                            this.clips.length = 0,
                            this.container && this.container.parent && this.container.parent.removeChild(this.container),
                            this.container && !this.container.destroyed && this.container.destroy()
                        }
                        onDragStart() {
                            this.container.cursor = "grabbing",
                            this.changed = !1
                        }
                        onDragEnd() {
                            this.container.cursor = "pointer",
                            this.changed && (this.changed = !1,
                            this.manager.editor.commitHistoryMutation ? this.manager.editor.commitHistoryMutation() : this.manager.editor.pushHistory())
                        }
                        onDragMove() {
                            this.overBorder(),
                            this.updateDeco(),
                            this.manager && this.manager.editor && this.manager.editor.refreshEditValues && this.manager.editor.refreshEditValues(),
                            this.changed = !0
                        }
                        overBorder() {
                            let e = this.container.position
                              , t = e.x * e.x + e.y * e.y;
                            let range = this.manager.positionRange || 60;
                            if (t > range * range) {
                                let i = range / Math.sqrt(t);
                                e.x *= i,
                                e.y *= i
                            }
                        }
                        updateDeco() {
                            const e = this.container
                              , t = e.position;
                            if (1 == this.decos.length) {
                                const i = this.decos[0];
                                i.clip.position.copyFrom(t),
                                i.clip.rotation = l.normalizeRadians(e.rotation),
                                i.clip.scale.copyFrom(e.scale)
                            } else
                            this.decos.forEach(((i, a) => {
                                const o = this.clips[a]; // 原始參照 (Original reference)
                        
                                // 1. 計算位置 (Position) - 這部分你原本的邏輯是對的
                                let n = s.fromPIXIPoint(o.position);
                                n.x *= e.scale.x;
                                n.y *= e.scale.y;
                                n.rotate(this.container.rotation);
                                i.clip.position.set(t.x + n.x, t.y + n.y);
                        
                                // 2. 矩陣計算 (Matrix Calculation)
                                // 我們手動計算：父矩陣(Container) x 子矩陣(Original)
                                
                                // 父容器 (Container) 的變換參數
                                const cr = Math.cos(e.rotation);
                                const sr = Math.sin(e.rotation);
                                const p_a = e.scale.x * cr;   // Matrix a
                                const p_b = e.scale.x * sr;   // Matrix b
                                const p_c = e.scale.y * -sr;  // Matrix c
                                const p_d = e.scale.y * cr;   // Matrix d
                        
                                // 子物件 (Original) 的局部變換參數
                                const cr2 = Math.cos(o.rotation);
                                const sr2 = Math.sin(o.rotation);
                                const c_a = o.scale.x * cr2;
                                const c_b = o.scale.x * sr2;
                                const c_c = o.scale.y * -sr2;
                                const c_d = o.scale.y * cr2;
                        
                                // 矩陣相乘 (Multiply: Parent x Child)
                                // Result = [a, b, c, d]
                                const a_val = p_a * c_a + p_c * c_b;
                                const b_val = p_b * c_a + p_d * c_b;
                                const c_val = p_a * c_c + p_c * c_d;
                                const d_val = p_b * c_c + p_d * c_d;
                        
                                // 3. 從結果矩陣還原旋轉與縮放 (Decompose Matrix)
                                
                                // 計算最終角度 (atan2 handles correct quadrant)
                                i.clip.rotation = Math.atan2(b_val, a_val);
                        
                                // 計算最終縮放 (Vector length)
                                const scaleX = Math.sqrt(a_val * a_val + b_val * b_val);
                                const scaleY = Math.sqrt(c_val * c_val + d_val * d_val);
                        
                                // 檢查行列式 (Determinant) 來判斷是否需要翻轉
                                // 如果行列式 < 0，代表最終結果包含翻轉
                                const det = a_val * d_val - b_val * c_val;
                                
                                i.clip.scale.set(scaleX, det < 0 ? -scaleY : scaleY);
                            }));
                        }
                        move(e, t) {
                            this.container.x += e,
                            this.container.y += t,
                            this.overBorder(),
                            this.updateDeco()
                        }
                        setPosition(e, t) {
                            this.container.position.set(e, t),
                            this.overBorder(),
                            this.updateDeco()
                        }
                        setScale(e, t) {
                            this.container.scale.set(e, t),
                            this.updateDeco()
                        }
                        _getMaxScale() {
                            let e = Number.MAX_SAFE_INTEGER;
                            if (1 == this.decos.length)
                                return this.decos[0].maxScale;
                            for (let t of this.decos)
                                e = Math.min(e, Math.abs(t.maxScale / t.clip.scaleX));
                            return e
                        }
                        _getMinScale() {
                            let e = Number.MIN_SAFE_INTEGER;
                            if (1 == this.decos.length)
                                return this.decos[0].minScale;
                            for (let t of this.decos)
                                e = Math.max(e, Math.abs(t.minScale / t.clip.scaleX));
                            return e
                        }
                        _getMaxRatio() {
                            let e = Number.MAX_SAFE_INTEGER;
                            for (let t of this.decos) {
                                let i = t.clip.scaleY / t.clip.scaleX;
                                e = Math.min(e, Math.abs(n.DecoConstant.SCALE_RATIO_MAX / i))
                            }
                            return e
                        }
                        _getMinRatio() {
                            let e = Number.MIN_SAFE_INTEGER;
                            for (let t of this.decos) {
                                let i = t.clip.scaleY / t.clip.scaleX;
                                e = Math.max(e, Math.abs(n.DecoConstant.SCALE_RATIO_MIN / i))
                            }
                            return e
                        }
                        setRotationDeg(e) {
                            this.container.rotationDeg = e,
                            this.updateDeco()
                        }
                        getRotationDeg() {
                            return this.container.rotationDeg
                        }
                    }
                    )
                }
            }
        }
        )),
        CgLibs.bootLib("TWRoleCgEditor/app", ["TWRoleCgEditor/app", "TWRoleCgEditor/appInit", "TWRoleCgEditor/libs/Utils", "TWRoleCgEditor/roleeditor/RoleEditorApp", "TWRoleCgEditor/roleeditor/InGameRoleEditorApp", "TWRoleCgEditor/translations/index", "TWRoleCgEditor/ResourceGate", "TWRoleCgEditor/BaseHelperApp", "TWRoleCgEditor/translations/trans.en", "TWRoleCgEditor/translations/trans.zh", "TWRoleCgEditor/translations/trans.cn", "TWRoleCgEditor/roleeditor/RoleEditor", "TWRoleCgEditor/roleeditor/DecoManager", "TWRoleCgEditor/roleeditor/DecoItem", "TWRoleCgEditor/roleeditor/fixIngameRoleDesign", "TWRoleCgEditor/roleeditor/DecoConstant", "TWRoleCgEditor/roleeditor/DecoController"])
    }
};
