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
            return !~Object.values(OPT).indexOf(k)
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
        System.register("TWRoleCgEditor/app", ["./appInit", "./helpers/HelperApp", "./viewers/ViewerApp", "./libs/Utils", "./viewers/WeaponViewer", "./weapons/WeaponApp", "./itemicons/ItemIconApp", "./viewers/ItemIconViewer", "./mapblocks/MapBlockApp", "./viewers/MapBlockViewer", "./roleeditor/RoleEditorApp", "./roleeditor/InGameRoleEditorApp", "./weaponeditor/WeaponEditorApp", "./viewers/CustomWeaponViewer", "./viewers/CustomItemViewer", "./itemeditor/ItemEditorApp", "./mapobjs/MapObjectApp", "./viewers/MapObjectViewer", "./farweaponeditor/FarWeaponEditorApp", "./throwableEditor/ThrowableWeaponEditorApp"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g, f, I, w, R, b, y, E, C, T, S;
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
                , function(e) {
                    l = e
                }
                , function(e) {
                    c = e
                }
                , function(e) {
                    p = e
                }
                , function(e) {
                    d = e
                }
                , function(e) {
                    h = e
                }
                , function(e) {
                    m = e
                }
                , function(e) {
                    u = e
                }
                , function(e) {
                    g = e
                }
                , function(e) {
                    f = e
                }
                , function(e) {
                    I = e
                }
                , function(e) {
                    w = e
                }
                , function(e) {
                    R = e
                }
                , function(e) {
                    b = e
                }
                , function(e) {
                    y = e
                }
                , function(e) {
                    E = e
                }
                , function(e) {
                    C = e
                }
                ],
                execute: function() {
                    a = e.Base.utils.NetUtil,
                    o.app_inited,
                    T = a.getQueryStringValue("usage"),
                    S = r.Utils.parseUsage(T, a.getQueryStringValue("params")),
                    "selectRole" == T ? new s.HelperApp(a.getQueryStringValue("path"),S) : T.includes("selectWeapon") || T.includes("selectGroundItem") || T.includes("selectMissionItem") || T.includes("selectStoreItem") || T.includes("selectStoreWeapon") || T.includes("selectLegendWeapon") || T.includes("selectCustomWeapon") ? new c.WeaponApp(a.getQueryStringValue("path"),S) : "selectItemIcon" == T ? new p.ItemIconApp(a.getQueryStringValue("path"),S) : "selectMapBlock" == T ? new h.MapBlockApp(a.getQueryStringValue("path"),S) : "selectMapObject" == T ? new b.MapObjectApp(a.getQueryStringValue("path"),S) : "viewer" == T ? "role" == S.params.type ? new n.ViewerApp(a.getQueryStringValue("path"),S) : "weapon" == S.params.type || "item" == S.params.type || "storeItem" == S.params.type ? new l.WeaponViewer(a.getQueryStringValue("path"),S) : "itemIcon" == S.params.type ? new d.ItemIconViewer(a.getQueryStringValue("path"),S) : "mapBlock" == S.params.type ? new m.MapBlockViewer(a.getQueryStringValue("path"),S) : "mapObject" == S.params.type ? new y.MapObjectViewer(a.getQueryStringValue("path"),S) : "customWeapon" == S.params.type || "customFarWeapon" == S.params.type || "customThrowableWeapon" == S.params.type ? new I.CustomWeaponViewer(a.getQueryStringValue("path"),S) : "customItem" == S.params.type && new w.CustomItemViewer(a.getQueryStringValue("path"),S) : "ingameEditor" == T ? new g.InGameRoleEditorApp(S).start() : "editWeapon" == T ? new f.WeaponEditorApp(a.getQueryStringValue("path"),S) : "editFarWeapon" == T ? new E.FarWeaponEditorApp(a.getQueryStringValue("path"),S) : "editThrowableWeapon" == T ? new C.ThrowableWeaponEditorApp(a.getQueryStringValue("path"),S) : "editItem" == T ? new R.ItemEditorApp(a.getQueryStringValue("path"),S) : new u.RoleEditorApp("role",S)
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
                    a.stageAlignVertial = o.ALIGN_VERTICAL.TOP,
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
        System.register("TWRoleCgEditor/helpers/HelperApp", ["./Index", "./../BaseHelperApp"], (function(t, i) {
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
                    s = class extends o.BaseHelperApp {
                        constructor(t, i) {
                            super(t, i),
                            $(document.body).css("background", "#456"),
                            e.Base.resourceManager.addAppResource("TwilightWarsLib.actors")
                        }
                        onEditorInited() {
                            a.showHelperIndexScreen({
                                emitter: this,
                                appUsage: this.appUsage
                            })
                        }
                    }
                    ,
                    t("HelperApp", s)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/viewers/ViewerApp", ["./../BaseHelperApp"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                ],
                execute: function() {
                    o = e.TwilightWarsLib.games.datas.RoleDesignData,
                    s = e.TwilightWarsLib.games.displays.ActorClip,
                    n = e.TwilightWarsLib.games.dummyGame,
                    r = e.Base.geom.PointInt,
                    l = e.Base.geom.Point,
                    c = class extends a.BaseHelperApp {
                        constructor(t, i) {
                            super(t, i),
                            this.actorClips = [],
                            this.addAppResources("TwilightWarsLib.actors"),
                            $(document.body).css("background", "transparent"),
                            this.on("requestJson", this.onRequestJson, this)
                        }
                        getRoleFromJson(t) {
                            return t && t.rsrc ? (this.addAppResources([t.rsrc, "TwilightWarsLib.role_decorations"]),
                            this.loadResourcesOnce("ViewerApp:role:" + String(t.rsrc), [t.rsrc, "TwilightWarsLib.role_decorations"]).then(( () => o.createFromAppResource(t.rsrc)))) : Promise.resolve(o.createFromJson(t || {}))
                        }
                        onEditorInited() {
                            this.importInitJson(this.appUsage.initJson)
                        }
                        on_refreshJson(e) {
                            let t = e.data.data;
                            this.appUsage.initJson = t,
                            this.importInitJson(t)
                        }
                        importInitJson(e) {
                            e && e.list ? this.createActorClips(e.list) : this.createActorClips(e ? [e] : [])
                        }
                        createActorClips(e) {
                            this.actorClips.forEach((e => e && e.dispose && e.dispose())),
                            this.actorClips.length = 0,
                            e = Array.isArray(e) ? e.filter((e => !!e)) : [];
                            if (!e.length)
                                return;
                            let t = Math.ceil(Math.sqrt(e.length))
                              , i = (t - 1) / 2
                              , a = t > 1 ? .9 : .8
                              , o = new l(parseInt(this.appUsage.params.width || "48"),parseInt(this.appUsage.params.height || "48"))
                              , s = new l(o.x / t,o.y / t);
                            this.actorClips = e.map(( (e, n) => {
                                let l = new r(n % t,Math.floor(n / t))
                                  , c = this.createActorClip(e);
                                return c.scale.set(a / t),
                                c.x = o.x / 2 + (l.x - i) * s.x,
                                c.y = o.y / 2 + (l.y - i) * s.y,
                                c
                            }
                            ))
                        }
                        createActorClip(t) {
                            let i = new s(n);
                            return this.getRoleFromJson(t).then((e => {
                                this.disposed || (i.setRole(e),
                                i.setBodyFrame("IDLE_KONGFU_TYPE", !1))
                            }
                            )),
                            this.disposed || e.Base.pixi.root.addChild(i),
                            i
                        }
                        onDispose() {
                            this.actorClips.forEach((e => e && e.dispose && e.dispose())),
                            this.actorClips.length = 0,
                            this.off("requestJson", this.onRequestJson, this)
                        }
                        onRequestJson(e) {
                            e.json = this.appUsage.initJson
                        }
                    }
                    ,
                    t("ViewerApp", c)
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
        System.register("TWRoleCgEditor/viewers/WeaponViewer", ["./../BaseViewerApp", "./../weapons/WeaponChooser"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g, f;
            i && i.id,
            i && i.id;
            function I(t, i) {
                let a = i.iconUrl;
                a = a.replace(/^https:\/\/[a-z]+\./, "https://" + e.Base.projectCode.toLowerCase() + ".");
                let o = PIXI.Sprite.from(a);
                o.width = parseInt(t.appUsage.params.width || "64"),
                o.height = parseInt(t.appUsage.params.height || "64"),
                t.setSprite(o, {
                    skipPosition: !0
                }),
                o.position.set(0, 0)
            }
            function w(e, t) {
                for (var i of (t = t.substring(h.length),
                e.subConfigs)) {
                    let e = i.customWeapons && i.customWeapons.find((e => e.code == t));
                    if (e)
                        return e
                }
                return e.config && e.config.customWeapons && e.config.customWeapons.find((e => e.code == t))
            }
            function R(e, t) {
                for (var i of (t = t.substring(m.length),
                e.subConfigs)) {
                    let e = i.customFarWeapons && i.customFarWeapons.find((e => e.code == t));
                    if (e)
                        return e
                }
                return e.config && e.config.customFarWeapons && e.config.customFarWeapons.find((e => e.code == t))
            }
            function b(e, t) {
                for (var i of (t = t.substring(u.length),
                e.subConfigs)) {
                    let e = i.customThrowableWeapons && i.customThrowableWeapons.find((e => e.code == t));
                    if (e)
                        return e
                }
                return e.config && e.config.customThrowableWeapons && e.config.customThrowableWeapons.find((e => e.code == t))
            }
            function y(e, t) {
                for (var i of (t = t.substring(g.length),
                e.subConfigs)) {
                    let e = i.customItems && i.customItems.find((e => e.code == t));
                    if (e)
                        return e
                }
                return e.config && e.config.customItems && e.config.customItems.find((e => e.code == t))
            }
            return t("getCustomWeaponDef", w),
            t("getCustomFarWeaponDef", R),
            t("getCustomThrowableWeaponDef", b),
            t("getCustomItemDef", y),
            {
                setters: [function(e) {
                    o = e
                }
                , function(e) {
                    s = e
                }
                ],
                execute: function() {
                    a = e.Base.translation.translate,
                    n = e.TwilightWarsLib.games.items.StuffInfo,
                    r = e.TwilightWarsLib.games.items.weapons.customs.CustomCloseWeaponInfo,
                    l = e.TwilightWarsLib.games.items.mapitems.customs.CustomItemInfo,
                    c = e.TwilightWarsLib.games.items.weapons.customs.CustomFarWeaponInfo,
                    p = e.TwilightWarsLib.games.items.weapons.customs.CustomThrowableWeaponInfo,
                    d = e.TwilightWarsLib.games.items.CustomStoreItem,
                    h = "custom_",
                    m = "cusfar_",
                    u = "custhr_",
                    g = "cusitem_",
                    f = class extends o.BaseViewerApp {
                        constructor(t, i) {
                            super(t, i),
                            this.addAppResources(["TwilightWarsLib.actors", "TwilightWarsLib.assets"])
                        }
                        onConfigReady(e) {
                            this.prepare(this.appUsage.initJson)
                        }
                        prepare(e) {
                            let t = n.getByCode(e);
                            if (!t && "string" == typeof e && e)
                                if (e.startsWith(h)) {
                                    let i = w(this, e);
                                    i && (i.prepareWeaponInfo(),
                                    t = r.getByCustomCode(i.code))
                                } else if (e.startsWith(m)) {
                                    let i = R(this, e);
                                    i && (i.prepareWeaponInfo(),
                                    t = c.getByCustomCode(i.code))
                                } else if (e.startsWith(u)) {
                                    let i = b(this, e);
                                    i && (i.prepareWeaponInfo(),
                                    t = p.getByCustomCode(i.code))
                                } else if (e.startsWith(g)) {
                                    let i = y(this, e);
                                    i && (i.prepareItemInfo(),
                                    t = l.getByCustomCode(i.code))
                                } else
                                    e.includes(".") && !e.startsWith("TwilightwarsLib.") && (t = new d(e));
                            return t
                        }
                        onEditorInited() {
                            this.refreshSprite()
                        }
                        createEmptySprite() {
                            return this.showEmptySprite({
                                width: 64,
                                height: 64
                            })
                        }
                        refreshSprite() {
                            this.clearSprite();
                            const t = this.appUsage && this.appUsage.initJson;
                            if (t) {
                                const e = (this.gameItems || []).find((e => e.code == t));
                                if (e)
                                    I(this, e);
                                else {
                                    let e = s.getStuffInfoByCode(t);
                                    if (e && e.isStoreItem && !e.isWeapon) {
                                        const t = (this.gameItems || []).find((t => t.code == e.gameItemCode));
                                        t ? I(this, t) : this.createEmptySprite()
                                    } else
                                        e ? (this.sprite = s.createStuffIcon(e),
                                        this.sprite && (this.sprite.scale.set(.8 * e.scaleOnIcon),
                                        this.onSpriteCreated())) : this.createEmptySprite()
                                }
                            } else
                                this.createEmptySprite()
                        }
                        onSpriteCreated() {
                            this.sprite && (this.sprite.position.set(this.getParamSize("width", 64) / 2, this.getParamSize("height", 64) / 2),
                            this.addSpriteToRoot(this.sprite))
                        }
                        on_refreshJson(t) {
                            let i = t && t.data ? t.data.data : null
                              , a = this.nextRefreshToken();
                            this.appUsage.initJson = i;
                            let o = this.prepare(this.appUsage.initJson);
                            o && o.isCustom ? this.loadViewerResources("WeaponViewer:" + String(i || ""), null, null).then(( () => {
                                this.isRefreshTokenActive(a) && this.refreshSprite()
                            }
                            )) : this.refreshSprite()
                        }
                        onRequestJson(e) {
                            e.json = this.appUsage.initJson
                        }
                    }
                    ,
                    t("WeaponViewer", f)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/weapons/WeaponApp", ["./../BaseHelperApp", "./WeaponChooser"], (function(t, i) {
            "use strict";
            var a, o, s, n;
            i && i.id,
            i && i.id;
            function r(e) {
                let t = e.customWeapons;
                t && t.forEach((e => {
                    e.prepareWeaponInfo()
                }
                )),
                t = e.customFarWeapons,
                t && t.forEach((e => {
                    e.prepareWeaponInfo()
                }
                )),
                t = e.customThrowableWeapons,
                t && t.forEach((e => {
                    e.prepareWeaponInfo()
                }
                ));
                let i = e.customItems;
                i && i.forEach((e => {
                    e.prepareItemInfo()
                }
                ))
            }
            return t("getStoreItem", (function(e) {
                return n[e]
            }
            )),
            {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    o = e
                }
                ],
                execute: function() {
                    s = class extends a.BaseHelperApp {
                        constructor(t, i) {
                            super(t, i),
                            $(document.body).css("background", "#456"),
                            e.Base.resourceManager.addAppResource("TwilightWarsLib.actors").addAppResource("TwilightWarsLib.assets").addAppResource("TwilightWarsLib.esgame_ui")
                        }
                        onConfigReady(e) {
                            r(e),
                            this.subConfigs.forEach((e => {
                                r(e)
                            }
                            ))
                        }
                        onEditorInited() {
                            let e = Promise.resolve();
                            this.gameItems && this.gameItems.forEach((e => {
                                n[e.code] = e
                            }
                            )),
                            e.then(( () => {
                                o.showWeaponChooserScreen({
                                    emitter: this,
                                    appUsage: this.appUsage,
                                    twconfigs: [this.config].concat(this.subConfigs)
                                })
                            }
                            ))
                        }
                    }
                    ,
                    t("WeaponApp", s),
                    n = {}
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/itemicons/ItemIconApp", ["./../BaseHelperApp", "./ItemIconChooser"], (function(t, i) {
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
                    s = class extends a.BaseHelperApp {
                        constructor(t, i) {
                            super(t, i),
                            $(document.body).css("background", "#456"),
                            e.Base.resourceManager.addAppResource("TwilightWarsLib.assets").addAppResource("TwilightWarsLib.actors")
                        }
                        onConfigReady(e) {
                            e.customItems && e.customItems.forEach((e => {
                                e.prepareItemInfo()
                            }
                            ))
                        }
                        onEditorInited() {
                            o.showItemIconChooserScreen({
                                emitter: this,
                                appUsage: this.appUsage,
                                twconfigs: [this.config].concat(this.subConfigs)
                            })
                        }
                    }
                    ,
                    t("ItemIconApp", s)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/viewers/ItemIconViewer", ["./../BaseViewerApp"], (function(t, i) {
            "use strict";
            var a, o, s, n;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                ],
                execute: function() {
                    o = e.TwilightWarsLib.games.uis.ItemIcon,
                    s = e.TwilightWarsLib.games.items.StuffInfo,
                    n = class extends a.BaseViewerApp {
                        constructor(t, i) {
                            super(t, i),
                            this.addAppResources(["TwilightWarsLib.assets", "TwilightWarsLib.actors"])
                        }
                        onConfigReady(e) {
                            e.customItems && e.customItems.forEach((e => {
                                e.prepareItemInfo()
                            }
                            ))
                        }
                        onEditorInited() {
                            this.refreshSprite()
                        }
                        refreshSprite() {
                            this.clearSprite();
                            const e = this.appUsage && this.appUsage.initJson;
                            let t = o.getByCode(e)
                              , i = null
                              , a = null;
                            if (t) {
                                const e = t.options && t.options.shift ? t.options.shift : {
                                    x: 0,
                                    y: 0
                                };
                                i = t.createIcon(),
                                a = t => t.position.set(this.getParamSize("width", 48) / 2 + e.x + 6, this.getParamSize("height", 48) / 2 + e.y)
                            } else {
                                let t = s.getByCode(e);
                                t && t.spriteInfo && (i = t.spriteInfo.createClipOnIcon(),
                                i && i.scale.set(t.scaleOnIcon || 1),
                                a = e => e.position.set(this.getParamSize("width", 48) / 2 + (t.iconShiftX || 0), this.getParamSize("height", 48) / 2 + (t.iconShiftY || 0)))
                            }
                            i ? this.setSprite(i, {
                                position: a
                            }) : this.showEmptySprite({
                                width: 48,
                                height: 48
                            })
                        }
                        on_refreshJson(e) {
                            let t = e && e.data ? e.data.data : null;
                            this.appUsage.initJson = t,
                            this.refreshSprite()
                        }
                        onRequestJson(e) {
                            e.json = this.appUsage.initJson
                        }
                    }
                    ,
                    t("ItemIconViewer", n)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/mapblocks/MapBlockApp", ["./../BaseHelperApp", "./MapBlockChooser", "./MapBlockInfo"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    r = e
                }
                , function(e) {
                    l = e
                }
                ],
                execute: function() {
                    o = e.TWMap.resources.MapResource,
                    s = e.TWMap.renderers.MapRenderer,
                    n = e.TWMap.data.TiledMap,
                    c = e.Base.utils.ArrayUtil,
                    p = class extends a.BaseHelperApp {
                        constructor(e, t) {
                            super(e, t),
                            $(document.body).css("background", "#456")
                        }
                        onEditorInited() {
                            const t = this.config && this.config.map;
                            if (!t)
                                return;
                            e.Base.showCGPreloader(),
                            this.addAppSources(t),
                            this.loadResourcesOnce("MapBlockApp:map:" + String(t), null, t).then(( () => {
                                if (this.disposed)
                                    return;
                                this.mapResource = new o,
                                this.mapResource.importBase64(e.Base.resourceManager.getText(t));
                                return this.mapResource.loadTextures()
                            }
                            )).then(( () => {
                                if (this.disposed)
                                    return;
                                e.Base.hideCGPreloader(),
                                this.mapRenderer = new s(new n(this.mapResource));
                                let t = l.MapBlockInfo.listAll(this.mapResource);
                                // Preview display objects are built lazily by MapBlockBox when virtualized rows enter the viewport.
                                c.sortOn(t, "code", !0),
                                r.showMapBlockChooserScreen({
                                    emitter: this,
                                    appUsage: this.appUsage,
                                    mapRenderer: this.mapRenderer,
                                    mapResource: this.mapResource,
                                    blockTypes: t
                                })
                            }
                            )).catch((t => {
                                this.disposed || (e.Base.hideCGPreloader(),
                                console.error(t))
                            }
                            ))
                        }
                    }
                    ,
                    t("MapBlockApp", p)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/viewers/MapBlockViewer", ["./../BaseViewerApp"], (function(t, i) {
            "use strict";
            var a, o, s, n, r;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                ],
                execute: function() {
                    o = e.TWMap.resources.MapResource,
                    s = e.TWMap.renderers.MapRenderer,
                    n = e.TWMap.data.TiledMap,
                    r = class extends a.BaseViewerApp {
                        constructor(t, i) {
                            super(t, i),
                            this.padding = 5,
                            this.renderer = null,
                            this.text = null,
                            this.mapResource = null,
                            this.mapRenderer = null,
                            this.addAppResources("TwilightWarsLib.assets")
                        }
                        onEditorInited() {
                            const t = this.config && this.config.map;
                            if (!t)
                                return void this.showEmptySprite({
                                    width: 96,
                                    height: 96
                                });
                            this.addAppSources(t),
                            this.loadViewerResources("MapBlockViewer:map:" + String(t), null, t).then(( () => {
                                if (this.disposed)
                                    return;
                                this.mapResource = new o,
                                this.mapResource.importBase64(e.Base.resourceManager.getText(t));
                                return this.mapResource.loadTextures()
                            }
                            )).then(( () => {
                                this.disposed || (this.mapRenderer = new s(new n(this.mapResource)),
                                this.refreshSprite())
                            }
                            )).catch((e => {
                                this.disposed || (console.error(e),
                                this.showEmptySprite({
                                    width: 96,
                                    height: 96
                                }))
                            }
                            ))
                        }
                        clearRenderer() {
                            if (!this.renderer)
                                return;
                            try {
                                this.renderer.parent && this.renderer.parent.removeChild(this.renderer)
                            } catch (e) {}
                            try {
                                "function" == typeof this.renderer.dispose ? this.renderer.dispose() : "function" == typeof this.renderer.destroy && this.renderer.destroy({
                                    children: !0
                                })
                            } catch (e) {
                                try {
                                    "function" == typeof this.renderer.destroy && this.renderer.destroy()
                                } catch (e) {}
                            }
                            this.renderer = null
                        }
                        ensureContainer() {
                            if (this.sprite instanceof PIXI.Container)
                                return this.sprite;
                            this.clearSprite(),
                            this.text = null;
                            const t = new PIXI.Container;
                            this.sprite = t,
                            this.addSpriteToRoot(t);
                            try {
                                let i = e.Base.resourceManager.createGAFMovieClip("TwilightWarsLib.assets", "lib_rect");
                                i.children && i.children[0] && (i.children[0].tint = 14540253),
                                t.addChild(i),
                                i.width = 3 * this.mapResource.tileWidth + 2 * this.padding,
                                i.height = 3 * this.mapResource.tileHeight + 2 * this.padding
                            } catch (e) {
                                console.warn("MapBlockViewer: background placeholder unavailable", e)
                            }
                            return t
                        }
                        ensureText(t) {
                            return this.text && !this.text.destroyed || (this.text = new PIXI.Text("3x3", {
                                fontSize: 16,
                                fontFamily: '\"Noto Sans TC\",Roboto,sans-serif',
                                fill: 15658734,
                                stroke: 3355443,
                                strokeThickness: 2,
                                fontWeight: "bold"
                            }),
                            this.text.resolution = 2),
                            this.text.position.set(1.5 * t.tileWidth + this.padding, 3 * t.tileHeight),
                            this.text
                        }
                        refreshSprite() {
                            this.clearRenderer();
                            if (!this.mapResource || !this.mapRenderer)
                                return void this.showEmptySprite({
                                    width: 96,
                                    height: 96
                                });
                            const e = this.ensureContainer()
                              , t = this.ensureText(this.mapResource)
                              , i = this.appUsage && this.appUsage.initJson ? this.mapResource.getObjectResourceByName(this.appUsage.initJson) : null;
                            if (i) {
                                this.renderer = this.mapRenderer.buildObjectRenderer(i, 0, 0),
                                e.addChild(this.renderer),
                                i.columns % 2 ? this.renderer.pivot.x += .5 * this.mapResource.tileWidth : this.renderer.pivot.x += this.mapResource.tileWidth,
                                this.renderer.x = 1.5 * this.mapResource.tileWidth + this.padding,
                                i.rows % 2 ? this.renderer.pivot.y += .5 * this.mapResource.tileHeight : this.renderer.pivot.y += this.mapResource.tileHeight,
                                this.renderer.y = 1.5 * this.mapResource.tileHeight + this.padding;
                                let e = Math.min(1, 3 / i.columns, 3 / i.rows);
                                this.renderer.scale.set(e),
                                t.text = `${i.columns} x ${i.rows}`
                            } else
                                t.text = "?";
                            t.pivot.set(t.width / 2 - 2, t.height),
                            t.parent !== e && e.addChild(t)
                        }
                        on_refreshJson(e) {
                            let t = e && e.data ? e.data.data : null;
                            this.appUsage.initJson = t,
                            this.refreshSprite()
                        }
                        onDispose() {
                            this.clearRenderer(),
                            this.mapRenderer && "function" == typeof this.mapRenderer.dispose && this.mapRenderer.dispose(),
                            this.mapRenderer = null,
                            this.mapResource = null,
                            super.onDispose()
                        }
                    }
                    ,
                    t("MapBlockViewer", r)
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
        System.register("TWRoleCgEditor/weaponeditor/WeaponEditorApp", ["./../BaseHelperApp", "./WeaponEditor"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p;
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
                    s = e.Base.resourceManager,
                    n = e.TwilightWarsLib.games.items.StuffType,
                    r = e.TwilightWarsLib.games.configs.closeWeaponConfig,
                    l = e.TwilightWarsLib.games.configs.farWeaponConfig,
                    c = e.TwilightWarsLib.games.configs.throwableWeaponConfig,
                    p = class extends a.BaseHelperApp {
                        constructor(e, t) {
                            super(e, t),
                            this.overwrite = !0,
                            $(document.body).css("background", "#456"),
                            s.addAppResource("TwilightWarsLib.actors").addAppResource("TwilightWarsLib.assets").addAppResource("TwilightWarsLib.role_decorations"),
                            n.parseJson(r),
                            n.parseJson(l),
                            n.parseJson(c)
                        }
                        onEditorInited() {
                            o.showWeaponEditorScreen({
                                emitter: this,
                                appUsage: this.appUsage,
                                twconfig: this.config
                            })
                        }
                    }
                    ,
                    t("WeaponEditorApp", p)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/viewers/CustomWeaponViewer", ["./../BaseViewerApp"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                ],
                execute: function() {
                    o = e.TwilightWarsLib.games.items.weapons.customs.CustomCloseWeaponInfo,
                    s = e.TwilightWarsLib.games.items.weapons.customs.CustomFarWeaponInfo,
                    n = e.TwilightWarsLib.games.items.weapons.customs.CustomThrowableWeaponInfo,
                    r = e.Base.resourceManager,
                    l = class extends a.BaseViewerApp {
                        constructor(e, t) {
                            super(e, t),
                            this.addAppResources(["TwilightWarsLib.actors", "TwilightWarsLib.role_decorations"]),
                            "customThrowableWeapon" == (t && t.params && t.params.type) && this.addAppResources("TwilightWarsLib.assets")
                        }
                        onConfigReady(e) {
                            if (this.appUsage.initJson) {
                                let e = this.appUsage.initJson;
                                e && e.clipAlias && this.addAppResources(e.clipAlias)
                            }
                        }
                        onEditorInited() {
                            this.refreshSprite()
                        }
                        refreshSprite() {
                            this.clearSprite();
                            const e = this.appUsage && this.appUsage.initJson;
                            if (e && "object" == typeof e) {
                                let t = e.type
                                  , i = this.appUsage && this.appUsage.params ? this.appUsage.params.type : null
                                  , a = "far" == t || "customFarWeapon" == i ? new s("customfar") : "throwable" == t || "customThrowableWeapon" == i ? new n("customthr") : new o("customweapon");
                                a.parseJson(e);
                                const r = a.spriteInfo && a.spriteInfo.createClipOnIcon ? a.spriteInfo.createClipOnIcon() : null;
                                r ? (r.scale.set(a.scaleOnIcon || 1),
                                this.setSprite(r, {
                                    width: 96,
                                    height: 96
                                })) : this.showEmptySprite({
                                    width: 96,
                                    height: 96
                                })
                            } else
                                this.showEmptySprite({
                                    width: 96,
                                    height: 96
                                })
                        }
                        on_refreshJson(e) {
                            let t = e && e.data ? e.data.data : null
                              , i = this.nextRefreshToken();
                            this.appUsage.initJson = t;
                            const a = t && t.clipAlias ? t.clipAlias : null;
                            a && this.addAppResources(a),
                            a ? this.loadViewerResources("CustomWeaponViewer:" + String(a), a, null).then(( () => {
                                this.isRefreshTokenActive(i) && this.refreshSprite()
                            }
                            )) : this.refreshSprite()
                        }
                        onRequestJson(e) {
                            e.json = this.appUsage.initJson
                        }
                    }
                    ,
                    t("CustomWeaponViewer", l)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/viewers/CustomItemViewer", ["./../BaseViewerApp"], (function(t, i) {
            "use strict";
            var a, o, s;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                ],
                execute: function() {
                    o = e.TwilightWarsLib.games.items.mapitems.customs.CustomItemInfo,
                    s = class extends a.BaseViewerApp {
                        constructor(t, i) {
                            super(t, i),
                            this.addAppResources(["TwilightWarsLib.actors", "TwilightWarsLib.role_decorations"])
                        }
                        onConfigReady(t) {
                            if (this.appUsage.initJson) {
                                let t = this.appUsage.initJson;
                                t && t.clipAlias && this.addAppResources(t.clipAlias)
                            }
                        }
                        onEditorInited() {
                            this.refreshSprite()
                        }
                        refreshSprite() {
                            this.clearSprite();
                            const e = this.appUsage && this.appUsage.initJson;
                            if (e && "object" == typeof e) {
                                let t = new o("customitem");
                                t.parseJson(e);
                                const i = t.spriteInfo && t.spriteInfo.createClipOnIcon ? t.spriteInfo.createClipOnIcon() : null;
                                i ? this.setSprite(i, {
                                    width: 96,
                                    height: 96
                                }) : this.showEmptySprite({
                                    width: 96,
                                    height: 96
                                })
                            } else
                                this.showEmptySprite({
                                    width: 96,
                                    height: 96
                                })
                        }
                        on_refreshJson(t) {
                            let i = t && t.data ? t.data.data : null
                              , a = this.nextRefreshToken();
                            this.appUsage.initJson = i;
                            const o = i && i.clipAlias ? i.clipAlias : null;
                            o && this.addAppResources(o),
                            o ? this.loadViewerResources("CustomItemViewer:" + String(o), o, null).then(( () => {
                                this.isRefreshTokenActive(a) && this.refreshSprite()
                            }
                            )) : this.refreshSprite()
                        }
                        onRequestJson(e) {
                            e.json = this.appUsage.initJson
                        }
                    }
                    ,
                    t("CustomItemViewer", s)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/itemeditor/ItemEditorApp", ["./../BaseHelperApp", "./ItemEditor"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    o = e
                }
                , function(e) {
                    l = e
                }
                ],
                execute: function() {
                    a = e.Base.resourceManager,
                    s = e.TwilightWarsLib.games.items.StuffType,
                    n = e.TwilightWarsLib.games.configs.closeWeaponConfig,
                    r = e.TwilightWarsLib.games.configs.farWeaponConfig,
                    c = class extends o.BaseHelperApp {
                        constructor(e, t) {
                            super(e, t),
                            this.overwrite = !0,
                            $(document.body).css("background", "#456"),
                            a.addAppResource("TwilightWarsLib.actors").addAppResource("TwilightWarsLib.assets").addAppResource("TwilightWarsLib.role_decorations").addAppResource("TwilightWarsLib.cyrbit"),
                            s.parseJson(n),
                            s.parseJson(r)
                        }
                        onEditorInited() {
                            l.showItemEditorScreen({
                                emitter: this,
                                appUsage: this.appUsage,
                                twconfig: this.config
                            })
                        }
                    }
                    ,
                    t("ItemEditorApp", c)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/mapobjs/MapObjectApp", ["./../BaseHelperApp", "./../mapblocks/MapBlockChooser", "./../mapblocks/MapBlockInfo"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    l = e
                }
                , function(e) {
                    c = e
                }
                ],
                execute: function() {
                    o = e.TWMap.resources.MapResource,
                    s = e.TWMap.renderers.MapRenderer,
                    n = e.TWMap.data.TiledMap,
                    r = e.Base.utils.ArrayUtil,
                    p = class extends a.BaseHelperApp {
                        constructor(e, t) {
                            super(e, t),
                            $(document.body).css("background", "#456")
                        }
                        onEditorInited() {
                            const t = this.config && this.config.map;
                            if (!t)
                                return;
                            e.Base.showCGPreloader(),
                            this.addAppSources(t),
                            this.loadResourcesOnce("MapObjectApp:map:" + String(t), null, t).then(( () => {
                                if (this.disposed)
                                    return;
                                this.mapResource = new o,
                                this.mapResource.importBase64(e.Base.resourceManager.getText(t));
                                return this.mapResource.loadTextures()
                            }
                            )).then(( () => {
                                if (this.disposed)
                                    return;
                                e.Base.hideCGPreloader(),
                                this.mapRenderer = new s(new n(this.mapResource));
                                let t = new Set(e.TwilightWarsLib.games.devices.listMapBlockResources(this.mapResource))
                                  , i = new Set(["shadows"])
                                  , a = new Set(["bridge", "tileset", "wallset", "weapon", "device", "invisible", "camp", "team"])
                                  , o = this.mapResource.listObjectResources().filter((e => !(t.has(e) || e.name.includes("tileset") || a.has(e.getProperty("cat")) || i.has(e.name)))).map((e => new c.MapBlockInfo(e)));
                                // Map object preview is intentionally lazy-built by MapBlockBox when the item first becomes visible.
                                r.sortOn(o, "code", !0),
                                l.showMapBlockChooserScreen({
                                    emitter: this,
                                    appUsage: this.appUsage,
                                    mapRenderer: this.mapRenderer,
                                    mapResource: this.mapResource,
                                    blockTypes: o
                                })
                            }
                            )).catch((t => {
                                this.disposed || (e.Base.hideCGPreloader(),
                                console.error(t))
                            }
                            ))
                        }
                    }
                    ,
                    t("MapObjectApp", p)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/viewers/MapObjectViewer", ["./MapBlockViewer"], (function(e, t) {
            "use strict";
            var i, a;
            t && t.id,
            t && t.id;
            return {
                setters: [function(e) {
                    i = e
                }
                ],
                execute: function() {
                    a = class extends i.MapBlockViewer {
                        constructor(e, t) {
                            super(e, t)
                        }
                    }
                    ,
                    e("MapObjectViewer", a)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/farweaponeditor/FarWeaponEditorApp", ["./../BaseHelperApp", "./FarWeaponEditor"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    l = e
                }
                ],
                execute: function() {
                    o = e.Base.resourceManager,
                    s = e.TwilightWarsLib.games.items.StuffType,
                    n = e.TwilightWarsLib.games.configs.closeWeaponConfig,
                    r = e.TwilightWarsLib.games.configs.farWeaponConfig,
                    c = e.TwilightWarsLib.games.configs.throwableWeaponConfig,
                    p = class extends a.BaseHelperApp {
                        constructor(e, t) {
                            super(e, t),
                            this.overwrite = !0,
                            $(document.body).css("background", "#456"),
                            o.addAppResource("TwilightWarsLib.actors").addAppResource("TwilightWarsLib.assets").addAppResource("TwilightWarsLib.role_decorations"),
                            s.parseJson(n),
                            s.parseJson(r),
                            s.parseJson(c)
                        }
                        onEditorInited() {
                            l.showFarWeaponEditorScreen({
                                emitter: this,
                                appUsage: this.appUsage,
                                twconfig: this.config
                            })
                        }
                    }
                    ,
                    t("FarWeaponEditorApp", p)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/throwableEditor/ThrowableWeaponEditorApp", ["./../BaseHelperApp", "./ThrowableWeaponEditor"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p;
            i && i.id,
            i && i.id;
            return {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    c = e
                }
                ],
                execute: function() {
                    o = e.TwilightWarsLib.games.items.StuffType,
                    s = e.TwilightWarsLib.games.configs.closeWeaponConfig,
                    n = e.TwilightWarsLib.games.configs.farWeaponConfig,
                    r = e.TwilightWarsLib.games.configs.throwableWeaponConfig,
                    l = e.Base.resourceManager,
                    p = class extends a.BaseHelperApp {
                        constructor(e, t) {
                            super(e, t),
                            this.overwrite = !0,
                            $(document.body).css("background", "#456"),
                            l.addAppResource("TwilightWarsLib.actors").addAppResource("TwilightWarsLib.assets").addAppResource("TwilightWarsLib.role_decorations"),
                            o.parseJson(s),
                            o.parseJson(n),
                            o.parseJson(r)
                        }
                        onEditorInited() {
                            c.showThrowableWeaponEditorScreen({
                                emitter: this,
                                appUsage: this.appUsage,
                                twconfig: this.config
                            })
                        }
                    }
                    ,
                    t("ThrowableWeaponEditorApp", p)
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
        System.register("TWRoleCgEditor/BaseViewerApp", ["./BaseHelperApp", "./ResourceGate"], (function(t, i) {
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
                    s = class extends a.BaseHelperApp {
                        constructor(e, t) {
                            super(e, t),
                            this.sprite = null,
                            this._viewerRefreshToken = 0,
                            $(document.body).css("background", "transparent"),
                            this.on("requestJson", this.onRequestJson, this)
                        }
                        getParamSize(e, t) {
                            const i = this.appUsage && this.appUsage.params ? this.appUsage.params[e] : null
                              , a = parseInt(i || String(t), 10);
                            return isFinite(a) && !isNaN(a) ? a : t
                        }
                        nextRefreshToken() {
                            return ++this._viewerRefreshToken
                        }
                        isRefreshTokenActive(e) {
                            return !this.disposed && this._viewerRefreshToken === e
                        }
                        destroyDisplayObject(e) {
                            if (!e)
                                return;
                            try {
                                e.parent && e.parent.removeChild(e)
                            } catch (e) {}
                            try {
                                "function" == typeof e.dispose ? e.dispose() : "function" == typeof e.destroy && e.destroy({
                                    children: !0
                                })
                            } catch (t) {
                                try {
                                    "function" == typeof e.destroy && e.destroy()
                                } catch (e) {
                                    console.warn("BaseViewerApp: failed to destroy display object", e)
                                }
                            }
                        }
                        clearSprite() {
                            this.sprite && (this.destroyDisplayObject(this.sprite),
                            this.sprite = null)
                        }
                        addSpriteToRoot(t) {
                            return !(!t || this.disposed) && (e.Base.pixi && e.Base.pixi.root && !t.parent && e.Base.pixi.root.addChild(t),
                            !0)
                        }
                        setSprite(e, t) {
                            if (this.disposed)
                                return void this.destroyDisplayObject(e);
                            this.clearSprite(),
                            this.sprite = e,
                            e && (t && "function" == typeof t.position ? t.position(e) : this.positionSprite(e, t),
                            this.addSpriteToRoot(e))
                        }
                        positionSprite(e, t) {
                            if (!e || t && t.skipPosition)
                                return;
                            const i = this.getParamSize("width", t && t.width || 64) / 2
                              , a = this.getParamSize("height", t && t.height || 64) / 2;
                            e.position && e.position.set(i, a)
                        }
                        createEmptySprite() {
                            let t = new PIXI.Text(e.Base.translation.translate("label.empty"), {
                                fontSize: 16,
                                fontFamily: '"Noto Sans TC",Roboto,sans-serif',
                                fill: 15658734,
                                stroke: 3355443,
                                strokeThickness: 2,
                                fontWeight: "bold",
                                fontVariant: "small-caps"
                            });
                            return t.pivot.set(t.width / 2 - 2, t.height / 2),
                            t.resolution = 2,
                            t
                        }
                        showEmptySprite(t) {
                            const i = this.createEmptySprite();
                            return this.setSprite(i, t),
                            i
                        }
                        on_refreshJson(e) {
                            this.appUsage.initJson = e && e.data ? e.data.data : null,
                            this.refreshSprite && this.refreshSprite()
                        }
                        onRequestJson(e) {
                            e.json = this.appUsage ? this.appUsage.initJson : null
                        }
                        loadViewerResources(e, t, i) {
                            return o.ResourceGate.loadOnce(e, t, i)
                        }
                        onDispose() {
                            this.off("requestJson", this.onRequestJson, this),
                            this.clearSprite()
                        }
                    }
                    ,
                    t("BaseViewerApp", s)
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
        System.register("TWRoleCgEditor/mapblocks/MapBlockInfo", [], (function(t, i) {
            "use strict";
            i && i.id,
            i && i.id;
            return {
                setters: [],
                execute: function() {
                    t("MapBlockInfo", class t {
                        static listAll(i) {
                            return e.TwilightWarsLib.games.devices.listMapBlockResources(i).map((e => new t(e)))
                        }
                        constructor(e) {
                            this.objResource = e
                        }
                        get code() {
                            return this.objResource && this.objResource.name
                        }
                        build(e, t) {
                            if (this.sprite && !this.sprite.destroyed)
                                return this.sprite;
                            let i = new PIXI.Container
                              , a = this.text = new PIXI.Text("3x3",{
                                fontSize: 16,
                                fontFamily: '"Noto Sans TC",Roboto,sans-serif',
                                fill: 15658734,
                                stroke: 3355443,
                                strokeThickness: 2,
                                fontWeight: "bold"
                            });
                            a.resolution = 2;
                            let o = this.objResource;
                            if (o && t) {
                                let e = o.originPoint || {
                                    x: 0,
                                    y: 0
                                }
                                  , s = this.objRenderer = t.buildObjectRenderer(o, e.x, e.y);
                                s && i.addChild(s),
                                o.columns > 1 || o.rows > 1 ? a.text = `${o.columns} x ${o.rows}` : a.text = ""
                            } else
                                a.text = "?";
                            return a.pivot.set(a.width / 2 - 2, a.height),
                            a.position.set(i.width / 2, i.height - 5),
                            i.addChild(a),
                            this.sprite = i
                        }
                    }
                    )
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/helpers/Index", ["./RoleSetBox"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p;
            i && i.id,
            i && i.id;
            function d(e) {
                return e.roleset ? s.createFromRoleSet(e.roleset).exportSyncJson() : e.userRole ? e.userRole.exportSyncJson() : null
            }
            return t("showHelperIndexScreen", (function(t) {
                c && !p || (p && p.handleClose(),
                c = e.ReactMaterial.renderComponentWithStyle(Object.assign(o.getRoleSetBoxStyles(), {
                    root: {
                        "& .appBar": {
                            flexDirection: "row",
                            "& .MuiTabs-root": {
                                flex: 1
                            }
                        },
                        "& .tabContent": {
                            display: "none",
                            padding: 10
                        },
                        "&.officials .tabContent.officials": {
                            display: "block"
                        },
                        "&.userMade .tabContent.userMade": {
                            display: "block"
                        },
                        "& .btnBuildRole": {
                            fontSize: 16,
                            margin: "8px 5px 8px 8px",
                            float: "right"
                        }
                    },
                    roles: {
                        display: "flex",
                        flexWrap: "wrap",
                        position: "relative",
                        "& .buildRoleTip": {
                            border: "1px solid #abb",
                            borderRadius: 6,
                            margin: "10px 0",
                            padding: "10px 14px",
                            color: "#cdd"
                        }
                    }
                }), l, {
                    emitter: t.emitter,
                    appUsage: t.appUsage
                }))
            }
            )),
            {
                setters: [function(e) {
                    o = e
                }
                ],
                execute: function() {
                    a = e.TwilightWarsLib.games.datas.RoleSet,
                    s = e.TwilightWarsLib.games.datas.RoleDesignData,
                    n = e.Base.translation.translate,
                    r = e.Base.utils.ArrayUtil,
                    l = class extends React.Component {
                        constructor(t, i) {
                            super(t, i),
                            this.rolesets = a.listForUserMission(),
                            this.editorLink = "//" + e.Base.projectDomain + "/play",
                            this.handleTabChange = (e, t) => {
                                this.setState({
                                    currentTab: t
                                })
                            }
                            ,
                            this.selectRoleSet = (e, t) => {
                                if (!e && !t)
                                    return;
                                let i = this.state.multiple ? this.allowMultiple : 1
                                  , a = this.state.selected.slice();
                                if (this.allowMultiple > 1) {
                                    let i = this.isItemSelected(e, t);
                                    if (i)
                                        return r.removeElement(a, i),
                                        void this.setState({
                                            selected: a
                                        })
                                }
                                for (a.push({
                                    roleset: e,
                                    userRole: t
                                }); a.length > i; )
                                    a.shift();
                                this.setState({
                                    selected: a
                                }),
                                this.state.multiple || "selectRole" == this.props.appUsage.usage && this.props.emitter.emit("postData")
                            }
                            ,
                            this.btnBuildRole = () => {
                                e.ReactMaterial.dialogs.openAlertDialog({
                                    title: n("roleEditor.btn.buildRole"),
                                    message: n("roleEditor.buildRole"),
                                    maxWidth: "md",
                                    confirmLabel: n("roleEditor.btn.gotit")
                                })
                            }
                            ,
                            this.toggleMultiple = () => {
                                let e = !this.state.multiple && this.allowMultiple > 1
                                  , t = this.state.selected.slice();
                                !e && t.length > 1 && (t.length = 1),
                                this.setState({
                                    multiple: e,
                                    selected: t
                                })
                            }
                            ,
                            this.handleClose = () => {
                                e.React.unmountRootComponent(c),
                                c = null,
                                p = null
                            }
                            ,
                            p = this,
                            this.state = {
                                currentTab: "officials",
                                selected: [],
                                multiple: !1
                            }
                        }
                        get allowMultiple() {
                            return Number(this.props.appUsage.params.allowMultiple) || 1
                        }
                        componentDidMount() {
                            this.props.emitter.on("requestJson", this.onRequestJson, this),
                            function() {
                                let t = e.Base.listAppResourceAlias().filter((t => {
                                    if ("twrole" == e.Base.getAppResource(t).type)
                                        return e.Base.resourceManager.addAppResource(t),
                                        !0
                                }
                                ));
                                return t.length ? (e.Base.resourceManager.addAppResource("TwilightWarsLib.role_decorations"),
                                e.Base.resourceManager.load().then(( () => t.map((e => s.createFromAppResource(e)))))) : Promise.resolve([])
                            }().then((e => {
                                let t = this.props.appUsage.initJson || {
                                    list: []
                                }
                                  , i = this.collectSelectedItems(e, t.list ? t.list : [t]);
                                this.setState({
                                    roleDesigns: e,
                                    selected: i,
                                    multiple: i.length > 1
                                })
                            }
                            ))
                        }
                        componentWillUnmount() {
                            this.props.emitter.off("requestJson", this.onRequestJson, this)
                        }
                        collectSelectedItems(e, t) {
                            return t.map((t => {
                                if (t)
                                    if (t.rsrc) {
                                        let i = e.find((e => e.resourceAlias == t.rsrc));
                                        if (i)
                                            return {
                                                userRole: i
                                            }
                                    } else if (void 0 !== t.dr)
                                        return {
                                            roleset: a.getOfficial(t.dr)
                                        };
                                return null
                            }
                            )).filter((e => !!e))
                        }
                        onRequestJson(e) {
                            if ("selectRole" == this.props.appUsage.usage) {
                                let t = this.state.selected.slice(0, this.allowMultiple);
                                1 == t.length ? e.json = {
                                    _overwrite: 1,
                                    data: d(t[0])
                                } : t.length > 1 && (e.json = {
                                    _overwrite: 1,
                                    data: {
                                        list: t.map((e => d(e)))
                                    }
                                })
                            }
                        }
                        isItemSelected(e, t) {
                            return this.state.selected.find((i => i.userRole == t && i.roleset == e))
                        }
                        renderRoleDesigns() {
                            const e = this.state.roleDesigns;
                            return e ? e.length ? this.state.roleDesigns.map(( (e, t) => React.createElement(o.RoleSetBox, {
                                key: "role" + t,
                                classes: this.props.classes,
                                selected: !!this.isItemSelected(void 0, e),
                                onSelect: this.selectRoleSet,
                                role: e
                            }))) : React.createElement("div", null, React.createElement("div", null, n("roleEditor.noDesigns")), React.createElement("div", {
                                className: "buildRoleTip"
                            }, n("roleEditor.buildRole"))) : React.createElement(MaterialUI.CircularProgress, {
                                color: "inherit"
                            })
                        }
                        render() {
                            let e = this.props.classes
                              , t = [e.root, this.state.currentTab];
                            return React.createElement("div", {
                                className: t.join(" ")
                            }, React.createElement(MaterialUI.AppBar, {
                                position: "static",
                                className: "appBar"
                            }, React.createElement(MaterialUI.Tabs, {
                                value: this.state.currentTab,
                                onChange: this.handleTabChange
                            }, React.createElement(MaterialUI.Tab, {
                                label: n("label.officialRoles"),
                                value: "officials"
                            }), React.createElement(MaterialUI.Tab, {
                                label: n("label.userRoles"),
                                value: "userMade"
                            })), this.allowMultiple > 1 && React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: this.state.multiple,
                                    onChange: this.toggleMultiple
                                }),
                                label: n("label.allowMultiple", {
                                    max: this.allowMultiple
                                })
                            })), React.createElement("div", {
                                className: "tabContent officials"
                            }, React.createElement("div", {
                                className: e.roles
                            }, this.rolesets.map((t => React.createElement(o.RoleSetBox, {
                                key: "role" + t.id,
                                classes: e,
                                selected: !!this.isItemSelected(t, void 0),
                                onSelect: this.selectRoleSet,
                                roleSet: t
                            }))))), React.createElement("div", {
                                className: "tabContent userMade"
                            }, React.createElement(MaterialUI.Tooltip, {
                                title: n("roleEditor.btn.buildRoleTip")
                            }, React.createElement(MaterialUI.Button, {
                                variant: "contained",
                                className: "btnBuildRole",
                                color: "secondary",
                                endIcon: React.createElement(MaterialUI.Icon, null, "add"),
                                onClick: this.btnBuildRole,
                                href: this.editorLink,
                                target: "_blank"
                            }, n("roleEditor.btn.buildRole"))), React.createElement("div", {
                                className: e.roles
                            }, this.renderRoleDesigns())))
                        }
                    }
                    ,
                    t("HelperIndex", l)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/weapons/WeaponChooser", ["./WeaponBox", "./StoreItemBox", "./WeaponApp"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g, f, I, w;
            i && i.id,
            i && i.id;
            function R(e) {
                let t = [];
                for (let i of e)
                    i.useCustomWeapons && i.customWeapons && i.customWeapons.forEach((e => {
                        let i = c.getByCustomCode(e.code);
                        i && p.addUniqueElement(t, i)
                    }
                    )),
                    i.useCustomFarWeapons && i.customFarWeapons && i.customFarWeapons.forEach((e => {
                        let i = h.getByCustomCode(e.code);
                        i && p.addUniqueElement(t, i)
                    }
                    )),
                    i.useCustomThrowableWeapons && i.customThrowableWeapons && i.customThrowableWeapons.forEach((e => {
                        let i = m.getByCustomCode(e.code);
                        i && p.addUniqueElement(t, i)
                    }
                    ));
                return t
            }
            function b(e) {
                let t = [];
                for (let i of e)
                    i.useCustomItems && i.customItems && i.customItems.forEach((e => {
                        let i = d.getByCustomCode(e.code);
                        i && p.addUniqueElement(t, i)
                    }
                    ));
                return t
            }
            function y() {
                return s.getByCode("default") || new s("default")
            }
            function E() {
                return s.getByCode("") || new s("")
            }
            function C(e) {
                const t = r.EQUIPPABLE_STORE_ITEMS;
                return e.props.twconfigs.forEach((e => {
                    e.carryItemCodes.forEach((e => {
                        let i = u.getStoreItem(e);
                        i && 1 == i.limitPerUser && !e.startsWith("TwilightWarsLib.") && t.push(new g(e))
                    }
                    ))
                }
                )),
                t
            }
            function T(e, t, i=1) {
                return React.createElement(a.WeaponBox, {
                    key: "weapon" + t.code,
                    classes: e.props.classes,
                    weapon: t,
                    scale: i,
                    preSelected: e.isPreSelected(t),
                    selected: e.state.selected.weapon == t,
                    onSelect: e.selectWeapon
                })
            }
            function S(e, t) {
                return React.createElement(l.StoreItemBox, {
                    key: "item" + t.code,
                    classes: e.props.classes,
                    item: t,
                    preSelected: e.isPreSelected(t),
                    selected: e.state.selected.weapon == t,
                    onSelect: e.selectWeapon
                })
            }
            function x(e, t) {
                return React.createElement(a.WeaponBox, {
                    key: "cusitem" + t.code,
                    classes: e.props.classes,
                    weapon: t,
                    preSelected: e.isPreSelected(t),
                    selected: e.state.selected.weapon == t,
                    onSelect: e.selectWeapon
                })
            }
            function W(e) {
                return {
                    listType: "customWeapons",
                    list: R(e.props.twconfigs),
                    renderItem: T,
                    tip: React.createElement("div", {
                        className: "additionTip"
                    }, React.createElement(MaterialUI.Button, {
                        variant: "contained",
                        color: "primary",
                        onClick: () => {
                            e.props.emitter.emit("closeEditor", {
                                action: "openConfig",
                                configType: "TwilightWarsConfig",
                                configPath: "root.useCustomWeapons"
                            })
                        }
                    }, React.createElement(MaterialUI.Icon, null, "add"), o("weaponEditor.btnAddWeapon")), React.createElement(MaterialUI.Typography, null, o("weaponEditor.customWeaponTip")))
                }
            }
            return t("showWeaponChooserScreen", (function(t) {
                I && !w || (w && w.handleClose(),
                I = e.ReactMaterial.renderComponentWithStyle(Object.assign(a.getWeaponBoxStyles(), l.getStoreItemBoxStyles(), {
                    root: {
                        minHeight: "100%",
                        display: "flex",
                        flexDirection: "column",
                        "& .tabContent": {
                            display: "none",
                            flexDirection: "column",
                            padding: 10,
                            flex: 1
                        },
                        "& .additionTip": {
                            padding: 10,
                            display: "flex",
                            alignItems: "center",
                            "& > button": {
                                marginRight: 10
                            }
                        }
                    },
                    weapons: {
                        display: "flex",
                        flexWrap: "wrap",
                        position: "relative",
                        flex: 1,
                        placeContent: "flex-start"
                    }
                }), f, {
                    emitter: t.emitter,
                    appUsage: t.appUsage,
                    twconfigs: t.twconfigs
                }))
            }
            )),
            t("listCustomItemTypes", b),
            t("getStuffInfoByCode", (function(e) {
                let t = y();
                return e == t.code ? t : s.getByCode(e) || y()
            }
            )),
            t("getStuffInfoDefault", y),
            t("getStuffInfoEmpty", E),
            t("createStuffIcon", (function(e) {
                if (e == y() || e == E())
                    return function(e) {
                        let t = new PIXI.Text(o("label." + (e || "empty")),{
                            fontSize: 16,
                            fontFamily: '"Noto Sans TC",Roboto,sans-serif',
                            fill: 15658734,
                            stroke: 3355443,
                            strokeThickness: 2,
                            fontWeight: "bold",
                            fontVariant: "small-caps"
                        });
                        return t.pivot.set(t.width / 2 - 2, t.height / 2),
                        t.resolution = 2,
                        t
                    }(e.code);
                {
                    let t = n.getIconClip(e);
                    return t.scale.set(.8),
                    t
                }
            }
            )),
            {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    l = e
                }
                , function(e) {
                    u = e
                }
                ],
                execute: function() {
                    o = e.Base.translation.translate,
                    s = e.TwilightWarsLib.games.items.StuffInfo,
                    n = e.TwilightWarsLib.games.displays.StuffIcon,
                    r = e.TwilightWarsLib.games.items.StuffTypeList,
                    c = e.TwilightWarsLib.games.items.weapons.customs.CustomCloseWeaponInfo,
                    p = e.Base.utils.ArrayUtil,
                    d = e.TwilightWarsLib.games.items.mapitems.customs.CustomItemInfo,
                    h = e.TwilightWarsLib.games.items.weapons.customs.CustomFarWeaponInfo,
                    m = e.TwilightWarsLib.games.items.weapons.customs.CustomThrowableWeaponInfo,
                    g = e.TwilightWarsLib.games.items.CustomStoreItem,
                    f = class extends React.Component {
                        constructor(t) {
                            super(t),
                            this.handleTabChange = (e, t) => {
                                this.setState({
                                    currentTab: t
                                })
                            }
                            ,
                            this.selectWeapon = e => {
                                const t = Object.assign({}, this.state.selected, {
                                    weapon: e
                                });
                                this.setState({
                                    selected: t
                                }),
                                this.props.appUsage && this.props.appUsage.usage && this.props.appUsage.usage.startsWith("select") && this.props.emitter.emit("postData")
                            }
                            ,
                            this.handleClose = () => {
                                e.React.unmountRootComponent(I),
                                I = null,
                                w = null
                            }
                            ,
                            this.weaponListMap = function(e) {
                                let t = e.props.appUsage
                                  , i = [];
                                const a = t.usage;
                                a.includes("selectWeapon") || a.includes("selectGroundItem") ? i.push({
                                    listType: "mapWeapons",
                                    list: r.MAP_WEAPONS,
                                    renderItem: T
                                }, {
                                    listType: "shopWeapons",
                                    list: r.SHOP_WEAPONS,
                                    renderItem: S
                                }, {
                                    listType: "legendWeapons",
                                    list: r.LEGEND_WEAPONS,
                                    renderItem: T,
                                    renderScale: .85
                                }, W(e)) : a.includes("selectStoreWeapon") ? i.push({
                                    listType: "shopWeapons",
                                    list: r.SHOP_WEAPONS,
                                    renderItem: T
                                }) : a.includes("selectLegendWeapon") ? i.push({
                                    listType: "legendWeapons",
                                    list: r.LEGEND_WEAPONS,
                                    renderItem: T,
                                    renderScale: .85
                                }) : a.includes("selectCustomWeapon") && i.push(W(e)),
                                a.includes("selectMissionItem") && i.push({
                                    listType: "missionItems",
                                    list: r.MISSION_ITEMS,
                                    renderItem: T
                                }),
                                a.includes("selectStoreItem") && i.push({
                                    listType: "storeItems",
                                    list: C(e),
                                    renderItem: S
                                }),
                                a.includes("selectBookItem") && i.push({
                                    listType: "bookItems",
                                    list: r.BOOK_ITEMS,
                                    renderItem: S
                                }),
                                (a.includes("selectMissionItem") || a.includes("selectCustomItem")) && i.push({
                                    listType: "customItems",
                                    list: b(e.props.twconfigs),
                                    renderItem: x,
                                    tip: React.createElement("div", {
                                        className: "additionTip"
                                    }, React.createElement(MaterialUI.Button, {
                                        variant: "contained",
                                        color: "primary",
                                        onClick: () => {
                                            e.props.emitter.emit("closeEditor", {
                                                action: "openConfig",
                                                configType: "TwilightWarsConfig",
                                                configPath: "root.useCustomItems"
                                            })
                                        }
                                    }, React.createElement(MaterialUI.Icon, null, "add"), o("weaponEditor.btnAddItem")), React.createElement(MaterialUI.Typography, null, o("weaponEditor.customItemTip")))
                                });
                                let s = i.find((e => "mapWeapons" == e.listType));
                                return s && (a.includes("selectGroundItem") && (s.list = r.MAGZINE_ITEMS.concat(s.list)),
                                "false" == t.params.gatling && (s.list = s.list.filter((e => !e.immovable))),
                                t.params.addDefault && i[0].list.unshift(y()),
                                t.params.addEmpty && i[0].list.unshift(E())),
                                i
                            }(this),
                            this.state = {
                                currentTab: this.getDefaultTab(),
                                selected: {}
                            }
                        }
                        getDefaultTab() {
                            let e = this.props.appUsage.initJson;
                            return e && this.weaponListMap.find((t => t.list.find((t => t.code == e)))) || this.weaponListMap[0]
                        }
                        componentDidMount() {
                            this.props.emitter.on("requestJson", this.onRequestJson, this)
                        }
                        componentWillUnmount() {
                            this.props.emitter.off("requestJson", this.onRequestJson, this)
                        }
                        onRequestJson(e) {
                            this.props.appUsage && this.props.appUsage.usage && this.props.appUsage.usage.startsWith("select") && this.state.selected.weapon && (e.json = this.state.selected.weapon.code)
                        }
                        isPreSelected(e) {
                            return this.props.appUsage && this.props.appUsage.initJson == e.code
                        }
                        render() {
                            let e = this.props.classes
                              , t = [e.root];
                            return React.createElement("div", {
                                className: t.join(" ")
                            }, React.createElement(MaterialUI.AppBar, {
                                position: "static"
                            }, React.createElement(MaterialUI.Tabs, {
                                value: this.state.currentTab,
                                onChange: this.handleTabChange
                            }, this.weaponListMap.map((e => React.createElement(MaterialUI.Tab, {
                                key: e.listType,
                                label: o("label." + e.listType),
                                value: e
                            }))))), this.weaponListMap.map((t => {
                                return React.createElement("div", {
                                    key: t.listType,
                                    className: "tabContent " + t.listType,
                                    style: {
                                        display: t == this.state.currentTab ? "flex" : "none"
                                    }
                                }, React.createElement("div", {
                                    className: e.weapons
                                }, t.list.length ? t.list.map((e => t.renderItem(this, e, t.renderScale))) : o("customWeapons" == (i = t.listType) ? "message.noWeapon" : "customItems" == i ? "message.noItem" : "message.notDoneYet")), t.tip);
                                var i
                            }
                            )))
                        }
                    }
                    ,
                    t("WeaponChooser", f)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/itemicons/ItemIconChooser", ["./ItemIconBox", "./../weapons/WeaponChooser"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c;
            i && i.id,
            i && i.id;
            return t("showItemIconChooserScreen", (function(t) {
                l && !c || (c && c.handleClose(),
                l = e.ReactMaterial.renderComponentWithStyle(Object.assign(o.getItemIconBoxStyles(), {
                    root: {
                        padding: 10,
                        display: "flex",
                        flexWrap: "wrap",
                        position: "relative"
                    }
                }), r, {
                    emitter: t.emitter,
                    appUsage: t.appUsage,
                    twconfigs: t.twconfigs
                }))
            }
            )),
            {
                setters: [function(e) {
                    o = e
                }
                , function(e) {
                    s = e
                }
                ],
                execute: function() {
                    a = e.TwilightWarsLib.games.uis.ItemIcon,
                    n = e.Base.geom.Point,
                    r = class extends React.Component {
                        constructor(t) {
                            super(t),
                            this.selectItemIcon = e => {
                                const t = Object.assign({}, this.state.selected, {
                                    itemIcon: e
                                });
                                this.setState({
                                    selected: t
                                }),
                                this.props.appUsage && this.props.appUsage.usage && this.props.appUsage.usage.startsWith("select") && this.props.emitter.emit("postData")
                            }
                            ,
                            this.handleClose = () => {
                                e.React.unmountRootComponent(l),
                                l = null,
                                c = null
                            }
                            ,
                            this.itemIconList = a.listAll(),
                            this.customItems = s.listCustomItemTypes(t.twconfigs),
                            this.state = {
                                selected: {}
                            }
                        }
                        componentDidMount() {
                            this.props.emitter.on("requestJson", this.onRequestJson, this)
                        }
                        componentWillUnmount() {
                            this.props.emitter.off("requestJson", this.onRequestJson, this)
                        }
                        onRequestJson(e) {
                            this.props.appUsage && this.props.appUsage.usage && this.props.appUsage.usage.startsWith("select") && this.state.selected.itemIcon && (e.json = this.state.selected.itemIcon.code)
                        }
                        isPreSelected(e) {
                            return this.props.appUsage && this.props.appUsage.initJson == e.code
                        }
                        renderCustomItem(e) {
                            let t = new a(e.code,{
                                shift: n.fromXY(e.iconShiftX, e.iconShiftY),
                                scale: e.scaleOnIcon,
                                width: 12
                            });
                            return React.createElement(o.ItemIconBox, {
                                key: "icon" + t.code,
                                classes: this.props.classes,
                                itemIcon: t,
                                preSelected: this.isPreSelected(t),
                                selected: this.state.selected.itemIcon == t,
                                onSelect: this.selectItemIcon
                            })
                        }
                        render() {
                            let e = this.props.classes
                              , t = [e.root];
                            return React.createElement("div", {
                                className: t.join(" ")
                            }, this.itemIconList.map((t => React.createElement(o.ItemIconBox, {
                                key: "icon" + t.code,
                                classes: e,
                                itemIcon: t,
                                preSelected: this.isPreSelected(t),
                                selected: this.state.selected.itemIcon == t,
                                onSelect: this.selectItemIcon
                            }))), this.customItems.map((e => this.renderCustomItem(e))))
                        }
                    }
                    ,
                    t("ItemIconChooser", r)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/mapblocks/MapBlockChooser", ["./MapBlockBox"], (function(t, i) {
            "use strict";
            var a, o, s, n, r;
            i && i.id,
            i && i.id;
            function l(e) {
                const t = parseFloat(e);
                return isFinite(t) && !isNaN(t) ? t : 0
            }
            function c(e, t, i) {
                return Math.max(e, Math.min(t, i))
            }
            return t("showMapBlockChooserScreen", (function(t) {
                n && !r || (r && r.handleClose(),
                n = e.ReactMaterial.renderComponentWithStyle(Object.assign(a.getMapBlockBoxStyles(), {
                    root: {
                        padding: 10,
                        display: "flex",
                        flexWrap: "wrap",
                        position: "relative",
                        height: "100%",
                        overflow: "auto",
                        boxSizing: "border-box"
                    },
                    virtualSpacer: {
                        position: "relative",
                        width: "100%",
                        minHeight: 1,
                        flex: "0 0 100%"
                    },
                    virtualItem: {
                        position: "absolute",
                        boxSizing: "border-box"
                    }
                }), s, {
                    emitter: t.emitter,
                    appUsage: t.appUsage,
                    mapResource: t.mapResource,
                    mapRenderer: t.mapRenderer,
                    blockTypes: t.blockTypes
                }))
            }
            )),
            {
                setters: [function(e) {
                    a = e
                }
                ],
                execute: function() {
                    o = e.Base.translation.translate,
                    s = class extends React.Component {
                        constructor(t) {
                            super(t),
                            this.rootRef = React.createRef(),
                            this._mounted = !1,
                            this._layoutRaf = null,
                            this._lastLayoutKey = "",
                            this.selectBlock = e => {
                                const t = Object.assign({}, this.state.selected, {
                                    blockType: e
                                });
                                this.setState({
                                    selected: t
                                }),
                                this.props.appUsage && this.props.appUsage.usage && this.props.appUsage.usage.startsWith("select") && this.props.emitter.emit("postData")
                            }
                            ,
                            this.handleScroll = () => {
                                this.updateVisibleRange()
                            }
                            ,
                            this.handleResize = () => {
                                this.scheduleLayout(!0)
                            }
                            ,
                            this.handleClose = () => {
                                e.React.unmountRootComponent(n),
                                n = null,
                                r = null
                            }
                            ,
                            this.state = {
                                selected: {},
                                layout: {
                                    items: [],
                                    rows: [],
                                    height: 0,
                                    width: 0
                                },
                                range: {
                                    start: 0,
                                    end: 0
                                }
                            }
                        }
                        componentDidMount() {
                            this._mounted = !0,
                            this.props.emitter.on("requestJson", this.onRequestJson, this),
                            window.addEventListener("resize", this.handleResize),
                            this.scheduleLayout(!0)
                        }
                        componentDidUpdate(e) {
                            (e.blockTypes !== this.props.blockTypes || e.mapResource !== this.props.mapResource) && this.scheduleLayout(!0)
                        }
                        componentWillUnmount() {
                            this._mounted = !1,
                            this._layoutRaf && (window.cancelAnimationFrame ? window.cancelAnimationFrame(this._layoutRaf) : clearTimeout(this._layoutRaf)),
                            this._layoutRaf = null,
                            window.removeEventListener("resize", this.handleResize),
                            this.props.emitter.off("requestJson", this.onRequestJson, this)
                        }
                        getRootContentWidth() {
                            const e = this.rootRef.current;
                            if (!e)
                                return 0;
                            const t = window.getComputedStyle ? window.getComputedStyle(e) : null
                              , i = t ? l(t.paddingLeft) + l(t.paddingRight) : 0;
                            return Math.max(1, e.clientWidth - i)
                        }
                        getItemSize(e) {
                            const t = this.props.mapResource || e && e.objResource && e.objResource.mapResource
                              , i = e && e.objResource
                              , a = i ? Math.max(1, Number(i.columns) || 1) : 1
                              , o = i ? Math.max(1, Number(i.rows) || 1) : 1
                              , s = t && t.tileWidth ? t.tileWidth : 32
                              , n = t && t.tileHeight ? t.tileHeight : 32
                              , r = i ? Math.min(1, 3 / o) : 1
                              , l = a * s * r
                              , c = o * n * r;
                            return {
                                width: l,
                                height: c,
                                outerWidth: l + 24,
                                outerHeight: c + 24
                            }
                        }
                        buildLayout(e) {
                            const t = this.props.blockTypes || []
                              , i = []
                              , a = [];
                            let o = 0
                              , s = 0
                              , n = 0
                              , r = 0
                              , l = 0;
                            for (let p = 0; p < t.length; p++) {
                                const t = this.getItemSize(this.props.blockTypes[p])
                                  , d = Math.max(1, t.outerWidth)
                                  , h = Math.max(1, t.outerHeight);
                                o > 0 && o + d > e && (a.push({
                                    top: s,
                                    bottom: s + n,
                                    start: r,
                                    end: p - 1
                                }),
                                s += n,
                                o = 0,
                                n = 0,
                                r = p),
                                i[p] = {
                                    index: p,
                                    x: o,
                                    y: s,
                                    width: t.width,
                                    height: t.height,
                                    outerWidth: d,
                                    outerHeight: h,
                                    bottom: s + h
                                },
                                o += d,
                                n = Math.max(n, h),
                                l = Math.max(l, s + n)
                            }
                            return t.length && a.push({
                                top: s,
                                bottom: s + n,
                                start: r,
                                end: t.length - 1
                            }),
                            {
                                items: i,
                                rows: a,
                                height: l,
                                width: e
                            }
                        }
                        getVisibleRange(e) {
                            const t = this.rootRef.current;
                            if (!t || !e || !e.rows.length)
                                return {
                                    start: 0,
                                    end: 0
                                };
                            const i = t.scrollTop || 0
                              , a = t.clientHeight || window.innerHeight || 1
                              , o = Math.max(240, a)
                              , s = Math.max(0, i - o)
                              , n = i + a + o;
                            let r = 0
                              , l = e.rows.length - 1;
                            for (; r < e.rows.length && e.rows[r].bottom < s; )
                                r++;
                            for (; l >= r && e.rows[l].top > n; )
                                l--;
                            return r > l ? {
                                start: 0,
                                end: 0
                            } : {
                                start: e.rows[r].start,
                                end: e.rows[l].end + 1
                            }
                        }
                        scheduleLayout(e) {
                            if (!this._mounted)
                                return;
                            this._layoutRaf && (window.cancelAnimationFrame ? window.cancelAnimationFrame(this._layoutRaf) : clearTimeout(this._layoutRaf));
                            const t = window.requestAnimationFrame || function(e) {
                                return setTimeout(e, 16)
                            }
                            ;
                            this._layoutRaf = t((() => {
                                this._layoutRaf = null,
                                this.updateLayout(e)
                            }
                            ))
                        }
                        updateLayout(e) {
                            if (!this._mounted)
                                return;
                            const t = this.getRootContentWidth();
                            if (!t)
                                return;
                            const i = (this.props.blockTypes || []).length + ":" + Math.round(t);
                            let a = this.state.layout;
                            e || i !== this._lastLayoutKey ? (a = this.buildLayout(t),
                            this._lastLayoutKey = i) : a = this.state.layout;
                            const o = this.getVisibleRange(a);
                            this.setState((e => e.layout === a && e.range.start === o.start && e.range.end === o.end ? null : {
                                layout: a,
                                range: o
                            }))
                        }
                        updateVisibleRange() {
                            if (!this._mounted)
                                return;
                            const e = this.state.layout;
                            if (!e || !e.rows.length)
                                return void this.scheduleLayout(!0);
                            const t = this.getVisibleRange(e);
                            (t.start !== this.state.range.start || t.end !== this.state.range.end) && this.setState({
                                range: t
                            })
                        }
                        onRequestJson(e) {
                            this.props.appUsage && this.props.appUsage.usage && this.props.appUsage.usage.startsWith("select") && this.state.selected.blockType && (e.json = this.state.selected.blockType.code)
                        }
                        isPreSelected(e) {
                            return this.props.appUsage && this.props.appUsage.initJson == e.code
                        }
                        renderMapBlockList() {
                            const e = this.props.blockTypes || [];
                            if (!e.length)
                                return React.createElement("div", null, o("mapblock.emptyList"));
                            const t = this.state.layout || {
                                items: [],
                                height: 0
                            }
                              , i = this.state.range || {
                                start: 0,
                                end: 0
                            }
                              , a = [];
                            for (let o = c(0, e.length, i.start); o < c(0, e.length, i.end); o++) {
                                const i = t.items[o];
                                i && a.push(React.createElement("div", {
                                    key: e[o].code,
                                    className: this.props.classes.virtualItem,
                                    style: {
                                        left: i.x,
                                        top: i.y,
                                        width: i.outerWidth,
                                        height: i.outerHeight
                                    }
                                }, this.renderMapBlock(e[o])))
                            }
                            return React.createElement("div", {
                                className: this.props.classes.virtualSpacer,
                                style: {
                                    height: Math.max(1, t.height || 1)
                                }
                            }, a)
                        }
                        render() {
                            let e = [this.props.classes.root];
                            return React.createElement("div", {
                                className: e.join(" "),
                                ref: this.rootRef,
                                onScroll: this.handleScroll
                            }, this.renderMapBlockList())
                        }
                        renderMapBlock(e) {
                            return React.createElement(a.MapBlockBox, {
                                key: e.code,
                                classes: this.props.classes,
                                blockType: e,
                                mapResource: this.props.mapResource,
                                mapRenderer: this.props.mapRenderer,
                                preSelected: this.isPreSelected(e),
                                selected: this.state.selected.blockType == e,
                                onSelect: this.selectBlock
                            })
                        }
                    }
                    ,
                    t("MapBlockChooser", s)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/weaponeditor/WeaponEditor", ["./WeaponEditorDisplay"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p;
            i && i.id,
            i && i.id;
            function d() {
                return {
                    root: {
                        "& .sidebar": {
                            background: "#445566",
                            position: "absolute",
                            left: 0,
                            top: 0,
                            "&.top": {
                                right: 0,
                                height: 15
                            },
                            "&.left": {
                                bottom: 0,
                                width: 15
                            }
                        },
                        "& .tabContent": {
                            display: "none",
                            padding: 10
                        }
                    },
                    loading: {
                        position: "absolute",
                        left: 200,
                        top: 140
                    },
                    aliasItem: {
                        display: "flex",
                        alignItems: "center",
                        "& img": {
                            marginLeft: 15
                        }
                    },
                    controlBar: {
                        display: "flex",
                        background: "#222",
                        position: "absolute",
                        left: 15,
                        top: 317,
                        width: 413,
                        "& button": {
                            borderRadius: 0,
                            background: "#223344",
                            color: "#ccc;",
                            "&:hover": {
                                background: "#556677"
                            }
                        }
                    },
                    editor: {
                        position: "absolute",
                        left: 443,
                        top: 15,
                        right: 15,
                        bottom: 15,
                        overflow: "auto",
                        padding: 5,
                        display: "flex",
                        flexDirection: "column",
                        background: "#eee",
                        borderRadius: 5,
                        color: "#333",
                        "&.spriteInfo": {
                            left: 15,
                            right: "unset",
                            width: 413,
                            top: 377,
                            boxSizing: "border-box",
                            paddingTop: 0
                        },
                        "& .clipAlias": {
                            marginTop: 0
                        },
                        "& > *": {
                            margin: 10
                        },
                        "& .hidden": {
                            display: "none"
                        },
                        "& .propRow": {
                            display: "flex",
                            alignItems: "center",
                            "& > *": {
                                marginLeft: 10
                            },
                            "& > *:first-child": {
                                marginLeft: 0
                            },
                            "& > div": {
                                width: 140
                            },
                            "& .title": {
                                flex: 1
                            },
                            "&.noMargin": {
                                margin: 0
                            },
                            "&.noMarginTop": {
                                marginTop: 0
                            },
                            "&.leftMargin": {
                                marginLeft: 32
                            }
                        },
                        "& .spriteInfo": {
                            display: "flex",
                            flexDirection: "column",
                            borderTop: "1px dotted #999",
                            "& > *": {
                                margin: "10px 0"
                            },
                            "&:first-child": {
                                borderTop: "none"
                            },
                            "&.noTitle": {
                                borderTop: "none"
                            }
                        },
                        "& .fireInfoList": {
                            display: "flex",
                            flexDirection: "column"
                        },
                        "& .fireInfo": {
                            border: "1px solid #666",
                            borderRadius: 5,
                            position: "relative",
                            padding: "12px 10px 10px 0",
                            margin: "12px 0 8px",
                            "& .fireTitle": {
                                background: "#eee",
                                padding: "0 4px",
                                position: "absolute",
                                top: -10,
                                left: 10,
                                fontSize: 13,
                                color: "#666"
                            },
                            "& .fireInfoType": {
                                flex: 1
                            },
                            "& .fireInfoDmg": {
                                flex: 1
                            }
                        }
                    }
                }
            }
            return t("getWeaponEditorStyles", d),
            t("showWeaponEditorScreen", (function(t) {
                c && !p || (p && p.handleClose(),
                c = e.ReactMaterial.renderComponentWithStyle({
                    root: {
                        "& .sidebar": {
                            background: "#445566",
                            position: "absolute",
                            left: 0,
                            top: 0,
                            "&.top": {
                                right: 0,
                                height: 15
                            },
                            "&.left": {
                                bottom: 0,
                                width: 15
                            }
                        },
                        "& .tabContent": {
                            display: "none",
                            padding: 10
                        }
                    },
                    loading: {
                        position: "absolute",
                        left: 200,
                        top: 140
                    },
                    aliasItem: {
                        display: "flex",
                        alignItems: "center",
                        "& img": {
                            marginLeft: 15
                        }
                    },
                    controlBar: {
                        display: "flex",
                        background: "#222",
                        position: "absolute",
                        left: 15,
                        top: 317,
                        width: 413,
                        "& button": {
                            borderRadius: 0,
                            background: "#223344",
                            color: "#ccc;",
                            "&:hover": {
                                background: "#556677"
                            }
                        }
                    },
                    editor: {
                        position: "absolute",
                        left: 443,
                        top: 15,
                        right: 15,
                        bottom: 15,
                        overflow: "auto",
                        padding: 5,
                        display: "flex",
                        flexDirection: "column",
                        background: "#eee",
                        borderRadius: 5,
                        color: "#333",
                        "&.spriteInfo": {
                            left: 15,
                            right: "unset",
                            width: 413,
                            top: 377,
                            boxSizing: "border-box",
                            paddingTop: 0
                        },
                        "& .clipAlias": {
                            marginTop: 0
                        },
                        "& > *": {
                            margin: 10
                        },
                        "& .hidden": {
                            display: "none"
                        },
                        "& .propRow": {
                            display: "flex",
                            alignItems: "center",
                            "& > *": {
                                marginLeft: 10
                            },
                            "& > *:first-child": {
                                marginLeft: 0
                            },
                            "& > div": {
                                width: 140
                            },
                            "& .title": {
                                flex: 1
                            },
                            "&.noMargin": {
                                margin: 0
                            },
                            "&.noMarginTop": {
                                marginTop: 0
                            },
                            "&.leftMargin": {
                                marginLeft: 32
                            }
                        },
                        "& .spriteInfo": {
                            display: "flex",
                            flexDirection: "column",
                            borderTop: "1px dotted #999",
                            "& > *": {
                                margin: "10px 0"
                            },
                            "&:first-child": {
                                borderTop: "none"
                            },
                            "&.noTitle": {
                                borderTop: "none"
                            }
                        },
                        "& .fireInfoList": {
                            display: "flex",
                            flexDirection: "column"
                        },
                        "& .fireInfo": {
                            border: "1px solid #666",
                            borderRadius: 5,
                            position: "relative",
                            padding: "12px 10px 10px 0",
                            margin: "12px 0 8px",
                            "& .fireTitle": {
                                background: "#eee",
                                padding: "0 4px",
                                position: "absolute",
                                top: -10,
                                left: 10,
                                fontSize: 13,
                                color: "#666"
                            },
                            "& .fireInfoType": {
                                flex: 1
                            },
                            "& .fireInfoDmg": {
                                flex: 1
                            }
                        }
                    }
                }, l, {
                    emitter: t.emitter,
                    appUsage: t.appUsage
                }),
                $(c).css("z-index", 100))
            }
            )),
            {
                setters: [function(e) {
                    a = e
                }
                ],
                execute: function() {
                    o = e.TwilightWarsLib.games.items.weapons.customs.CustomCloseWeaponFireType,
                    s = e.Base.translation.translate,
                    n = e.Base.keyboard.Key,
                    r = e.Base.utils.ArrayUtil,
                    l = class extends React.Component {
                        constructor(t) {
                            super(t),
                            this.display = new a.CloseWeaponEditorDisplay,
                            this.btnAddCombo = () => {
                                let e = this.weaponProps;
                                e.fireInfoList.length < 5 && (e.fireInfoList.push({
                                    fireType: o.SLASH.code,
                                    deltaDamage: 0
                                }),
                                this.updateWeaponProps(),
                                this.refreshDisplay())
                            }
                            ,
                            this.handleClose = () => {
                                e.React.unmountRootComponent(c),
                                c = null,
                                p = null
                            }
                            ,
                            this.weaponProps = this.buildInitConfig(),
                            this.state = {
                                loading: !0,
                                weaponProps: this.weaponProps
                            },
                            this.refreshDisplay(),
                            this.display.once("loaded", this.onDisplayLoaded, this)
                        }
                        onDisplayLoaded() {
                            this.setState({
                                loading: !1
                            })
                        }
                        buildInitConfig() {
                            let e = {
                                alias: "",
                                baseDamage: 25,
                                weight: 6,
                                swapTime: 800,
                                scaleOnGround: .8,
                                scaleOnIcon: 1,
                                widerPickTest: !0,
                                handX: 0,
                                handY: 0,
                                handR: 0,
                                handSx: 1,
                                handSy: 1,
                                iconAuto: !0,
                                iconX: 0,
                                iconY: 0,
                                iconR: -60,
                                iconSx: 1,
                                iconSy: 1,
                                fireInfoList: [{
                                    fireType: o.SLASH.code,
                                    deltaDamage: 0
                                }]
                            }
                              , t = this.props.appUsage.initJson;
                            if (t && t.fires) {
                                let i = t;
                                e.alias = i.clipAlias,
                                e.baseDamage = i.damage,
                                e.weight = i.weight,
                                e.swapTime = i.swapTime,
                                e.scaleOnGround = i.scaleOnGround,
                                e.fireInfoList = i.fires,
                                e.scaleOnIcon = i.scaleOnIcon || 1,
                                e.widerPickTest = "wider" == i.pickTestFunc;
                                let a = i.sprite;
                                a && (a.pivotOnHand && (e.handX = a.pivotOnHand.x,
                                e.handY = a.pivotOnHand.y,
                                e.handR = a.pivotOnHand.degrees,
                                e.handSx = a.pivotOnHand.scale.x,
                                e.handSy = a.pivotOnHand.scale.y),
                                a.pivotOnIcon && (e.iconAuto = !1,
                                e.iconX = a.pivotOnIcon.x,
                                e.iconY = a.pivotOnIcon.y,
                                e.iconR = a.pivotOnIcon.degrees,
                                e.iconSx = a.pivotOnIcon.scale.x,
                                e.iconSy = a.pivotOnIcon.scale.y))
                            }
                            return e
                        }
                        componentDidMount() {
                            this.props.emitter.on("requestJson", this.onRequestJson, this)
                        }
                        componentWillUnmount() {
                            this.props.emitter.off("requestJson", this.onRequestJson, this)
                        }
                        onRequestJson(e) {
                            e.json = this.exportWeaponInfo()
                        }
                        updateWeaponProps() {
                            this.setState({
                                weaponProps: this.weaponProps
                            })
                        }
                        refreshDisplay() {
                            this.display.setWeaponInfo(this.exportWeaponInfo())
                        }
                        exportWeaponInfo() {
                            let e = this.weaponProps
                              , t = {
                                type: "close",
                                clipAlias: e.alias,
                                scaleOnGround: e.scaleOnGround,
                                scaleOnIcon: e.scaleOnIcon,
                                pickTestFunc: e.widerPickTest ? "wider" : void 0,
                                weight: e.weight,
                                damage: e.baseDamage,
                                swapTime: e.swapTime,
                                frameName: "BLADE_TYPE",
                                clip: "",
                                fireTime: 1500,
                                fires: e.fireInfoList,
                                sprite: {
                                    pivotOnHand: {
                                        x: e.handX,
                                        y: e.handY,
                                        degrees: e.handR,
                                        scale: {
                                            x: e.handSx,
                                            y: e.handSy
                                        }
                                    }
                                }
                            };
                            return e.iconAuto || (t.sprite.pivotOnIcon = {
                                x: e.iconX,
                                y: e.iconY,
                                degrees: e.iconR,
                                scale: {
                                    x: e.iconSx,
                                    y: e.iconSy
                                }
                            }),
                            t
                        }
                        onWeaponProps(e, t) {
                            let i = this.weaponProps;
                            if ("checkbox" == e.target.type.toLowerCase())
                                i[t] = e.target.checked;
                            else {
                                let a = e.target.value;
                                if ("number" == e.target.type) {
                                    let e = Number(a);
                                    if (isNaN(e))
                                        return;
                                    a = e
                                }
                                i[t] = a
                            }
                            this.updateWeaponProps(),
                            this.refreshDisplay()
                        }
                        renderPropInput(e, t) {
                            return t = Object.assign({
                                inputType: "text",
                                step: 1
                            }, t || {}),
                            React.createElement(MaterialUI.TextField, {
                                type: t.inputType,
                                label: s("weaponEditor.prop." + e),
                                variant: "outlined",
                                value: this.state.weaponProps[e],
                                onChange: t => this.onWeaponProps(t, e),
                                InputProps: {
                                    endAdornment: t.unit && React.createElement(MaterialUI.InputAdornment, {
                                        position: "end"
                                    }, t.unit)
                                },
                                inputProps: {
                                    step: t.step
                                }
                            })
                        }
                        onAliasChange(e) {
                            let t = e.target.value;
                            this.weaponProps.alias = t,
                            this.updateWeaponProps(),
                            this.refreshDisplay()
                        }
                        renderClipAlias() {
                            let t = ["image", "twrole"]
                              , i = e.Base.listAppResourceAlias().filter((i => {
                                let a = e.Base.getAppResource(i);
                                return -1 != t.indexOf(a.type)
                            }
                            ));
                            return React.createElement(MaterialUI.FormControl, {
                                className: "clipAlias"
                            }, React.createElement(MaterialUI.InputLabel, null, s("weaponEditor.prop.alias")), React.createElement(MaterialUI.Select, {
                                value: this.weaponProps.alias,
                                renderValue: e => e || s("weaponEditor.aliasDefault"),
                                onChange: e => this.onAliasChange(e)
                            }, React.createElement(MaterialUI.MenuItem, {
                                value: ""
                            }, s("weaponEditor.aliasDefault")), i.map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e,
                                value: e,
                                className: this.props.classes.aliasItem
                            }, e, React.createElement("img", {
                                src: this.getAliasThumb(e),
                                height: "48"
                            }))))))
                        }
                        getAliasThumb(t) {
                            let i = e.Base.getAppResource(t)
                              , a = i.meta;
                            return i.url + (a.thumb || a.main)
                        }
                        onToggleWiderPickTest() {
                            let e = this.weaponProps;
                            e.widerPickTest = !e.widerPickTest,
                            this.updateWeaponProps()
                        }
                        renderEditor() {
                            return React.createElement("div", {
                                className: this.props.classes.editor
                            }, this.renderClipAlias(), React.createElement("div", {
                                className: "propRow noMargin"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: this.weaponProps.widerPickTest,
                                    onChange: e => this.onToggleWiderPickTest()
                                }),
                                label: s("weaponEditor.prop.widerPickTest")
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("baseDamage", {
                                inputType: "number"
                            }), this.renderPropInput("weight", {
                                inputType: "number",
                                step: .1
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("swapTime", {
                                inputType: "number",
                                unit: s("weaponEditor.ms")
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("scaleOnGround", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput("scaleOnIcon", {
                                inputType: "number",
                                step: .1
                            })), this.renderFireInfoList())
                        }
                        renderSpriteInfo(e, t) {
                            let i = this.state.weaponProps[e + "Auto"]
                              , a = React.createElement("div", {
                                className: "propRow"
                            }, React.createElement(MaterialUI.Typography, {
                                className: "title"
                            }, s("weaponEditor.prop." + e)), t ? React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: i,
                                    onChange: t => this.onWeaponProps(t, e + "Auto")
                                }),
                                label: s("weaponEditor.prop." + e + "Auto")
                            }) : null);
                            return i ? React.createElement("div", {
                                className: "spriteInfo"
                            }, a) : React.createElement("div", {
                                className: "spriteInfo"
                            }, a, React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput(e + "X", {
                                inputType: "number"
                            }), this.renderPropInput(e + "Y", {
                                inputType: "number"
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput(e + "R", {
                                inputType: "number"
                            }), this.renderPropInput(e + "Sx", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput(e + "Sy", {
                                inputType: "number",
                                step: .1
                            })))
                        }
                        renderSpriteEditor() {
                            return React.createElement("div", {
                                className: this.props.classes.editor + " spriteInfo"
                            }, this.renderSpriteInfo("hand", !1), this.renderSpriteInfo("icon", !0))
                        }
                        renderFireInfo(e, t) {
                            return React.createElement("div", {
                                className: "propRow fireInfo",
                                key: t
                            }, React.createElement(MaterialUI.Typography, {
                                className: "fireTitle"
                            }, s("weaponEditor.prop." + (t ? "fireCombo" : "fireFirst"), {
                                index: t
                            })), React.createElement(MaterialUI.FormControl, {
                                className: "fireInfoType"
                            }, React.createElement(MaterialUI.InputLabel, null, s("weaponEditor.prop.fireType")), React.createElement(MaterialUI.Select, {
                                value: e.fireType,
                                onChange: t => this.onFireTypeChange(t, e)
                            }, o.listAll().map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e.code,
                                value: e.code
                            }, e.name))))), t > 0 && React.createElement(MaterialUI.TextField, {
                                className: "fireInfoDmg",
                                type: "number",
                                label: s("weaponEditor.prop.deltaDamage"),
                                value: e.deltaDamage,
                                onChange: t => this.onDeltaDamageChanged(t, e)
                            }), t > 0 && React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.btnRemoveAction(e)
                            }, React.createElement(MaterialUI.Icon, null, "delete_forever")))
                        }
                        btnRemoveAction(e) {
                            let t = this.weaponProps;
                            t.fireInfoList.length > 1 && (r.removeElement(t.fireInfoList, e),
                            this.updateWeaponProps(),
                            this.refreshDisplay())
                        }
                        onFireTypeChange(e, t) {
                            t.fireType = e.target.value,
                            this.updateWeaponProps(),
                            this.refreshDisplay()
                        }
                        onDeltaDamageChanged(e, t) {
                            let i = Number(e.target.value);
                            isNaN(i) || (t.deltaDamage = i,
                            this.updateWeaponProps())
                        }
                        renderFireInfoList() {
                            return React.createElement("div", {
                                className: "fireInfoList"
                            }, React.createElement(MaterialUI.Typography, {
                                className: "title"
                            }, s("weaponEditor.prop.fireInfos")), this.state.weaponProps.fireInfoList.map(( (e, t) => this.renderFireInfo(e, t))), this.state.weaponProps.fireInfoList.length < 5 && React.createElement(MaterialUI.Button, {
                                className: "btnRemoveCombo",
                                onClick: this.btnAddCombo
                            }, React.createElement(MaterialUI.Icon, null, "add"), s("weaponEditor.btnAddCombo")))
                        }
                        renderLoading() {
                            return React.createElement("div", {
                                className: this.props.classes.loading
                            }, React.createElement(MaterialUI.CircularProgress, {
                                color: "inherit"
                            }))
                        }
                        render() {
                            return React.createElement("div", {
                                className: this.props.classes.root
                            }, React.createElement("div", {
                                className: "sidebar top"
                            }), React.createElement("div", {
                                className: "sidebar left"
                            }), React.createElement("div", {
                                className: this.props.classes.controlBar
                            }, React.createElement(MaterialUI.Tooltip, {
                                title: s("weaponEditor.control.animation")
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.display.onKeyDown(n.F)
                            }, React.createElement(MaterialUI.Icon, null, "play_arrow"))), React.createElement(MaterialUI.Tooltip, {
                                title: s("weaponEditor.control.comboAnim")
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.display.onKeyDown(n.C)
                            }, React.createElement(MaterialUI.Icon, null, "fast_forward"))), React.createElement("div", {
                                className: "spacer"
                            }), React.createElement(MaterialUI.Tooltip, {
                                title: s("weaponEditor.control.switchWeapon")
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.display.onKeyDown(n.Q)
                            }, React.createElement(MaterialUI.Icon, null, "cached")))), this.state.loading && this.renderLoading(), this.renderEditor(), this.renderSpriteEditor())
                        }
                    }
                    ,
                    t("WeaponEditor", l)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/itemeditor/ItemEditor", ["./../weaponeditor/WeaponEditor", "./ItemEditorDisplay"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h;
            i && i.id,
            i && i.id;
            function m() {
                let e = Object.assign({}, o.getWeaponEditorStyles());
                return Object.assign(e.editor, {
                    "& .propRow.indent": {
                        marginLeft: 20
                    },
                    "& .propRow.indent2": {
                        marginLeft: 40
                    },
                    "& .propRow.indent3": {
                        marginLeft: 60
                    },
                    "& .dropdown .MuiSelect-root": {
                        paddingLeft: 10
                    }
                }),
                Object.assign(e.editor["&.spriteInfo"], {
                    top: 253
                }),
                Object.assign(e.loading, {
                    top: 100
                }),
                e
            }
            return t("getStyles", m),
            t("showItemEditorScreen", (function(t) {
                d && !h || (h && h.handleClose(),
                d = e.ReactMaterial.renderComponentWithStyle(m(), p, {
                    emitter: t.emitter,
                    appUsage: t.appUsage
                }),
                $(d).css("z-index", 100))
            }
            )),
            {
                setters: [function(e) {
                    o = e
                }
                , function(e) {
                    s = e
                }
                ],
                execute: function() {
                    a = e.Base.translation.translate,
                    n = e.TwilightWarsLib.games.configs.EquipItemLayer,
                    r = e.TwilightWarsLib.games.configs.EquipItemUpdateType,
                    l = [n.ABOVE_HEAD, n.HAT, n.CAPE, n.ABOVE_FEET, n.UNDER_FEET],
                    c = [r.STILL, r.FOLLOW_HEAD, r.FOLLOW_CAPE, r.FOLLOW_VELOCITY, r.FOLLOW_FEET, r.ORBIT],
                    .3,
                    p = class extends React.Component {
                        constructor(t) {
                            super(t),
                            this.display = new s.ItemEditorDisplay,
                            this.onLayerSelected = e => {
                                this.itemProps.layer = n.getByCode(e.target.value),
                                this.updateItemProps(),
                                this.refreshDisplay()
                            }
                            ,
                            this.onUpdateTypeSelected = e => {
                                this.itemProps.updateType = r.getByCode(e.target.value),
                                this.updateItemProps(),
                                this.refreshDisplay()
                            }
                            ,
                            this.handleClose = () => {
                                e.React.unmountRootComponent(d),
                                d = null,
                                h = null
                            }
                            ,
                            this.itemProps = this.buildInitConfig(),
                            this.state = {
                                loading: !0,
                                itemProps: this.itemProps
                            },
                            this.refreshDisplay(),
                            this.display.once("loaded", this.onDisplayLoaded, this)
                        }
                        onDisplayLoaded() {
                            this.setState({
                                loading: !1
                            })
                        }
                        buildInitConfig() {
                            let e = {
                                alias: "",
                                equip: !1,
                                widerPickTest: !1,
                                layer: n.UNDER_FEET,
                                updateType: r.STILL,
                                radius: 30,
                                orbitSpeed: 3,
                                rotateSpeed: 0,
                                float: !1,
                                floatSpeed: 3,
                                floatScale: .02,
                                itemScaleOnIcon: .3,
                                iconShiftX: 0,
                                iconShiftY: 0,
                                handX: 0,
                                handY: 0,
                                handR: 0,
                                handSx: 1,
                                handSy: 1,
                                iconX: 0,
                                iconY: 0,
                                iconR: 0,
                                iconSx: 1,
                                iconSy: 1
                            }
                              , t = this.props.appUsage.initJson;
                            if (t && t.clipAlias) {
                                let i = t;
                                if (e.alias = i.clipAlias,
                                e.widerPickTest = "wider" == i.pickTestFunc,
                                e.itemScaleOnIcon = i.scaleOnIcon || .3,
                                e.iconShiftX = i.iconShiftX || 0,
                                e.iconShiftY = i.iconShiftY || 0,
                                i.equip) {
                                    e.equip = !0,
                                    e.layer = n.getByIndex(i.equip.layer) || n.UNDER_FEET,
                                    e.updateType = r.getByIndex(i.equip.updateType) || r.STILL;
                                    for (let t of ["radius", "orbitSpeed", "rotateSpeed", "floatScale"])
                                        i.equip[t] && (e[t] = i.equip[t]);
                                    i.equip.float && (e.float = !0,
                                    e.floatSpeed = i.equip.float)
                                }
                                let a = i.sprite;
                                a && (a.pivotOnHand && (e.handX = a.pivotOnHand.x,
                                e.handY = a.pivotOnHand.y,
                                e.handR = a.pivotOnHand.degrees,
                                e.handSx = a.pivotOnHand.scale.x,
                                e.handSy = a.pivotOnHand.scale.y),
                                a.pivotOnIcon && (e.iconX = a.pivotOnIcon.x,
                                e.iconY = a.pivotOnIcon.y,
                                e.iconR = a.pivotOnIcon.degrees,
                                e.iconSx = a.pivotOnIcon.scale.x,
                                e.iconSy = a.pivotOnIcon.scale.y))
                            }
                            return e
                        }
                        componentDidMount() {
                            this.props.emitter.on("requestJson", this.onRequestJson, this)
                        }
                        componentWillUnmount() {
                            this.props.emitter.off("requestJson", this.onRequestJson, this)
                        }
                        onRequestJson(e) {
                            e.json = this.exportItemInfo()
                        }
                        updateItemProps() {
                            this.setState({
                                itemProps: this.itemProps
                            })
                        }
                        refreshDisplay() {
                            this.display.setItemInfo(this.exportItemInfo())
                        }
                        exportItemInfo() {
                            let e = this.itemProps
                              , t = {
                                type: "customItem",
                                clipAlias: e.alias,
                                pickTestFunc: e.widerPickTest ? "wider" : void 0,
                                clip: "",
                                scaleOnIcon: e.itemScaleOnIcon,
                                iconShiftX: e.iconShiftX,
                                iconShiftY: e.iconShiftY,
                                sprite: {
                                    pivotOnHand: {
                                        x: e.handX,
                                        y: e.handY,
                                        degrees: e.handR,
                                        scale: {
                                            x: e.handSx,
                                            y: e.handSy
                                        }
                                    },
                                    pivotOnIcon: {
                                        x: e.iconX,
                                        y: e.iconY,
                                        degrees: e.iconR,
                                        scale: {
                                            x: e.iconSx,
                                            y: e.iconSy
                                        }
                                    }
                                }
                            };
                            return e.equip && (t.equip = {
                                layer: e.layer.index
                            },
                            e.layer.supportUpdate && (t.equip.updateType = e.updateType.index,
                            e.updateType == r.ORBIT && (t.equip.radius = e.radius,
                            t.equip.orbitSpeed = e.orbitSpeed,
                            t.equip.rotateSpeed = e.rotateSpeed),
                            e.float && (t.equip.float = e.floatSpeed,
                            t.equip.floatScale = e.floatScale))),
                            t
                        }
                        onItemProps(e, t) {
                            let i = this.itemProps;
                            if ("checkbox" == e.target.type.toLowerCase())
                                i[t] = e.target.checked;
                            else {
                                let a = e.target.value;
                                if ("number" == e.target.type) {
                                    let e = Number(a);
                                    if (isNaN(e))
                                        return;
                                    a = e
                                }
                                i[t] = a
                            }
                            this.updateItemProps(),
                            this.refreshDisplay()
                        }
                        renderPropInput(e, t) {
                            return t = Object.assign({
                                inputType: "text",
                                step: 1
                            }, t || {}),
                            React.createElement(MaterialUI.TextField, {
                                type: t.inputType,
                                label: a("weaponEditor.prop." + e),
                                variant: "outlined",
                                value: this.state.itemProps[e],
                                onChange: t => this.onItemProps(t, e),
                                InputProps: {
                                    endAdornment: t.unit && React.createElement(MaterialUI.InputAdornment, {
                                        position: "end"
                                    }, t.unit)
                                },
                                inputProps: {
                                    step: t.step
                                }
                            })
                        }
                        onAliasChange(e) {
                            let t = e.target.value;
                            this.itemProps.alias = t,
                            this.updateItemProps(),
                            this.refreshDisplay()
                        }
                        renderClipAlias() {
                            let t = ["image", "twrole"]
                              , i = e.Base.listAppResourceAlias().filter((i => {
                                let a = e.Base.getAppResource(i);
                                return -1 != t.indexOf(a.type)
                            }
                            ));
                            return React.createElement(MaterialUI.FormControl, {
                                className: "clipAlias"
                            }, React.createElement(MaterialUI.InputLabel, null, a("weaponEditor.prop.alias")), React.createElement(MaterialUI.Select, {
                                value: this.itemProps.alias,
                                renderValue: e => e || a("weaponEditor.aliasDefault"),
                                onChange: e => this.onAliasChange(e)
                            }, React.createElement(MaterialUI.MenuItem, {
                                value: ""
                            }, a("weaponEditor.aliasDefault")), i.map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e,
                                value: e,
                                className: this.props.classes.aliasItem
                            }, e, React.createElement("img", {
                                src: this.getAliasThumb(e),
                                height: "48"
                            }))))))
                        }
                        getAliasThumb(t) {
                            let i = e.Base.getAppResource(t)
                              , a = i.meta;
                            return i.url + (a.thumb || a.main)
                        }
                        onToggleEquip() {
                            let e = this.itemProps;
                            e.equip = !e.equip,
                            this.updateItemProps(),
                            this.refreshDisplay()
                        }
                        onToggleFloat() {
                            let e = this.itemProps;
                            e.float = !e.float,
                            this.updateItemProps(),
                            this.refreshDisplay()
                        }
                        onToggleWiderPickTest() {
                            let e = this.itemProps;
                            e.widerPickTest = !e.widerPickTest,
                            this.updateItemProps()
                        }
                        renderEditor() {
                            let e = this.state.itemProps;
                            return React.createElement("div", {
                                className: this.props.classes.editor
                            }, this.renderClipAlias(), React.createElement("div", {
                                className: "propRow noMargin"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: e.widerPickTest,
                                    onChange: e => this.onToggleWiderPickTest()
                                }),
                                label: a("weaponEditor.prop.widerPickTest")
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("itemScaleOnIcon", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput("iconShiftX", {
                                inputType: "number",
                                step: 1
                            }), this.renderPropInput("iconShiftY", {
                                inputType: "number",
                                step: 1
                            })), React.createElement("div", {
                                className: "propRow noMargin"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: e.equip,
                                    onChange: e => this.onToggleEquip()
                                }),
                                label: a("weaponEditor.prop.equippable")
                            })), React.createElement("div", {
                                className: e.equip ? "propRow indent noMarginTop" : "hidden"
                            }, React.createElement(MaterialUI.Select, {
                                className: "dropdown layer",
                                color: "secondary",
                                value: e.layer.code,
                                onChange: this.onLayerSelected
                            }, l.map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e.code,
                                value: e.code
                            }, e.name)))), e.layer.supportUpdate && React.createElement(MaterialUI.Select, {
                                className: "dropdown layer",
                                color: "secondary",
                                value: e.updateType.code,
                                onChange: this.onUpdateTypeSelected
                            }, c.map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e.code,
                                value: e.code
                            }, a("itemEditor.updateType." + e.code)))))), React.createElement("div", {
                                className: e.equip && e.layer.supportUpdate && e.updateType == r.ORBIT ? "propRow indent" : "hidden"
                            }, this.renderPropInput("radius", {
                                inputType: "number"
                            }), this.renderPropInput("orbitSpeed", {
                                inputType: "number"
                            }), this.renderPropInput("rotateSpeed", {
                                inputType: "number"
                            })), React.createElement("div", {
                                className: e.equip && e.layer.supportUpdate ? "propRow indent" : "hidden"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: e.float,
                                    onChange: e => this.onToggleFloat()
                                }),
                                label: a("weaponEditor.prop.float")
                            })), React.createElement("div", {
                                className: e.equip && e.layer.supportUpdate && e.float ? "propRow indent2" : "hidden"
                            }, this.renderPropInput("floatSpeed", {
                                inputType: "number"
                            }), this.renderPropInput("floatScale", {
                                inputType: "number",
                                step: .01
                            })))
                        }
                        renderSpriteInfo(e) {
                            let t = React.createElement("div", {
                                className: "propRow"
                            }, React.createElement(MaterialUI.Typography, {
                                className: "title"
                            }, a("weaponEditor.prop." + e)));
                            return React.createElement("div", {
                                className: "spriteInfo"
                            }, t, React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput(e + "X", {
                                inputType: "number"
                            }), this.renderPropInput(e + "Y", {
                                inputType: "number"
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput(e + "R", {
                                inputType: "number"
                            }), this.renderPropInput(e + "Sx", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput(e + "Sy", {
                                inputType: "number",
                                step: .1
                            })))
                        }
                        renderSpriteEditor() {
                            return React.createElement("div", {
                                className: this.props.classes.editor + " spriteInfo"
                            }, this.renderSpriteInfo("hand"), this.renderSpriteInfo("icon"))
                        }
                        renderLoading() {
                            return React.createElement("div", {
                                className: this.props.classes.loading
                            }, React.createElement(MaterialUI.CircularProgress, {
                                color: "inherit"
                            }))
                        }
                        render() {
                            return React.createElement("div", {
                                className: this.props.classes.root
                            }, React.createElement("div", {
                                className: "sidebar top"
                            }), React.createElement("div", {
                                className: "sidebar left"
                            }), this.state.loading && this.renderLoading(), this.renderEditor(), this.renderSpriteEditor())
                        }
                    }
                    ,
                    t("ItemEditor", p)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/farweaponeditor/FarWeaponEditor", ["./../weaponeditor/WeaponEditor", "./FarWeaponEditorDisplay"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g = this && this.__awaiter || function(e, t, i, a) {
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
            function f(e) {
                return g(this, void 0, void 0, (function*() {
                    return c.resourceToImageDataUrl(e.clip, e.clipAlias)
                }
                ))
            }
            function I(e, t) {
                return t.animType = e.code,
                w(e, t)
            }
            function w(e, t) {
                return Object.assign(t, {
                    baseDamage: e.damage,
                    weight: e.weight,
                    swapTime: e.swapTime,
                    gunLength: e.gunLength,
                    reloadTime: e.reloadTime,
                    minAimRange: e.minAimRange,
                    maxAimRange: e.maxAimRange,
                    shakeImpact: e.shakeImpact,
                    moveShakeRate: 100 * e.moveShakeRate,
                    aimFocusRate: 100 * e.aimFocusRate,
                    aimDistanceRangeRate: 100 * e.aimDistanceRangeRate,
                    fireDelay: e.fireDelay,
                    maxBullets: e.maxBullets,
                    pushPower: e.damageToPushbackPower,
                    autoTimes: e.automaticTimes,
                    rotateRate: e.rotateRate || 1
                })
            }
            function R(e, t=0) {
                return Math.max(t, Math.round(e))
            }
            function b(e, t=.01) {
                return Math.max(t, e)
            }
            return t("showFarWeaponEditorScreen", (function(t) {
                h && !m || (m && m.handleClose(),
                h = e.ReactMaterial.renderComponentWithStyle(Object.assign(a.getWeaponEditorStyles(), {
                    animType: {
                        display: "flex",
                        alignItems: "center",
                        "& .clipAlias": {
                            marginRight: 10,
                            width: 120
                        }
                    }
                }), d, {
                    emitter: t.emitter,
                    appUsage: t.appUsage
                }),
                $(h).css("z-index", 100))
            }
            )),
            {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    o = e
                }
                ],
                execute: function() {
                    s = e.Base.translation.translate,
                    n = e.TwilightWarsLib.games.items.weapons.customs.CustomFarWeaponInfo,
                    r = e.Base.keyboard.Key,
                    l = e.TwilightWarsLib.games.items.StuffType,
                    c = e.TwilightWarsLib.libs.utils.PixiUtil,
                    p = e.TwilightWarsLib.games.items.StuffInfo,
                    d = class extends React.Component {
                        constructor(t) {
                            super(t),
                            this.display = new o.FarWeaponEditorDisplay,
                            this.handleClose = () => {
                                e.React.unmountRootComponent(h),
                                h = null,
                                m = null
                            }
                            ,
                            this.onAnimTypeChange = e => {
                                this.weaponProps.animType = e.target.value,
                                this.updateWeaponProps(!0)
                            }
                            ,
                            this.onBtnApplyAnimTypeDefaults = () => {
                                e.ReactMaterial.dialogs.openConfirmDialog({
                                    message: s("weaponEditor.applyWeaponDefaults"),
                                    confirmLabel: s("btn.confirm"),
                                    cancelLabel: s("btn.cancel"),
                                    onClose: e => {
                                        if (e) {
                                            I(p.getByCode(this.weaponProps.animType), this.weaponProps),
                                            this.updateWeaponProps(!0)
                                        }
                                    }
                                })
                            }
                            ,
                            this.onTabChange = (e, t) => {
                                this.setState({
                                    tabIndex: t
                                })
                            }
                            ,
                            this.weaponProps = this.buildInitConfig(),
                            this.state = {
                                animTypeImages: {},
                                tabIndex: 0,
                                loading: !0,
                                weaponProps: this.weaponProps
                            },
                            this.refreshDisplay(),
                            this.display.once("loaded", this.onDisplayLoaded, this)
                        }
                        onDisplayLoaded() {
                            this.setState({
                                loading: !1
                            })
                        }
                        buildInitConfig() {
                            let e = this.props.appUsage.initJson
                              , t = u[0];
                            if (e && e.animType) {
                                let i = e;
                                t = p.getByCode(i.animType)
                            }
                            let i = I(t, {
                                alias: "",
                                gunAlias: "",
                                scaleOnGround: .8,
                                scaleOnIcon: 1,
                                widerPickTest: !0,
                                handX: 0,
                                handY: 0,
                                handR: 0,
                                handSx: 1,
                                handSy: 1,
                                reloadX: 0,
                                reloadY: 0,
                                reloadR: 0,
                                reloadSx: 1,
                                reloadSy: 1,
                                iconAuto: !1,
                                iconX: 0,
                                iconY: 0,
                                iconR: -60,
                                iconSx: 1,
                                iconSy: 1
                            });
                            if (e && e.animType) {
                                let t = e;
                                i.alias = t.clipAlias,
                                i.scaleOnGround = t.scaleOnGround,
                                i.scaleOnIcon = t.scaleOnIcon || 1,
                                i.widerPickTest = "wider" == t.pickTestFunc,
                                w(t, i);
                                let a = t.sprite;
                                a && (a.pivotOnHand && (i.handX = a.pivotOnHand.x,
                                i.handY = a.pivotOnHand.y,
                                i.handR = a.pivotOnHand.degrees,
                                i.handSx = a.pivotOnHand.scale.x,
                                i.handSy = a.pivotOnHand.scale.y),
                                a.pivotOnIcon && (i.iconAuto = !1,
                                i.iconX = a.pivotOnIcon.x,
                                i.iconY = a.pivotOnIcon.y,
                                i.iconR = a.pivotOnIcon.degrees,
                                i.iconSx = a.pivotOnIcon.scale.x,
                                i.iconSy = a.pivotOnIcon.scale.y));
                                let o = t.animClip.weapon;
                                o && (i.gunAlias = o.alias);
                                let s = t.animClip.reload && t.animClip.reload.pivot;
                                s && (i.reloadX = s.x,
                                i.reloadY = s.y,
                                i.reloadR = s.degrees,
                                i.reloadSx = s.scale.x,
                                i.reloadSy = s.scale.y)
                            }
                            return i
                        }
                        componentDidMount() {
                            this.props.emitter.on("requestJson", this.onRequestJson, this),
                            function() {
                                return g(this, void 0, void 0, (function*() {
                                    let e = {};
                                    for (let t of u) {
                                        let i = yield f(t);
                                        e[t.code] = i
                                    }
                                    return e
                                }
                                ))
                            }().then((e => {
                                this.setState({
                                    animTypeImages: e
                                })
                            }
                            ))
                        }
                        componentWillUnmount() {
                            this.props.emitter.off("requestJson", this.onRequestJson, this)
                        }
                        onRequestJson(e) {
                            e.json = this.exportWeaponInfo()
                        }
                        updateWeaponProps(e) {
                            this.setState({
                                weaponProps: this.weaponProps
                            }),
                            e && this.refreshDisplay()
                        }
                        refreshDisplay() {
                            this.display.setWeaponInfo(this.exportWeaponInfo())
                        }
                        exportWeaponInfo() {
                            let e = this.weaponProps
                              , t = n.createConfig({
                                animType: e.animType,
                                sprite: {
                                    pivotOnHand: {
                                        x: e.handX,
                                        y: e.handY,
                                        degrees: e.handR,
                                        scale: {
                                            x: e.handSx,
                                            y: e.handSy
                                        }
                                    }
                                }
                            });
                            !function(e, t) {
                                Object.assign(t, {
                                    animType: e.animType,
                                    damage: R(e.baseDamage, 0),
                                    weight: b(e.weight, 0),
                                    swapTime: R(e.swapTime, 100),
                                    gunLength: R(e.gunLength, 1),
                                    reloadTime: R(e.reloadTime, 100),
                                    minAimRange: b(e.minAimRange),
                                    maxAimRange: b(e.maxAimRange),
                                    shakeImpact: b(e.shakeImpact),
                                    moveShakeRate: b(e.moveShakeRate) / 100,
                                    aimFocusRate: b(e.aimFocusRate) / 100,
                                    aimDistanceRangeRate: b(e.aimDistanceRangeRate) / 100,
                                    fireDelay: R(e.fireDelay, 100),
                                    maxBullets: R(e.maxBullets, 1),
                                    damageToPushbackPower: R(e.pushPower),
                                    automaticTimes: R(e.autoTimes),
                                    rotateRate: b(e.rotateRate)
                                })
                            }(this.weaponProps, t);
                            let i = {
                                clipAlias: e.alias || t.clipAlias,
                                scaleOnGround: e.scaleOnGround,
                                scaleOnIcon: e.scaleOnIcon,
                                pickTestFunc: e.widerPickTest ? "wider" : void 0
                            };
                            return Object.assign(t, i),
                            t.animClip.reload && (t.animClip.reload.alias = e.alias,
                            t.animClip.reload.pivot = {
                                x: e.reloadX,
                                y: e.reloadY,
                                degrees: e.reloadR,
                                scale: {
                                    x: e.reloadSx,
                                    y: e.reloadSy
                                }
                            }),
                            t.animClip.weapon.alias = e.gunAlias,
                            e.iconAuto || (t.sprite.pivotOnIcon = {
                                x: e.iconX,
                                y: e.iconY,
                                degrees: e.iconR,
                                scale: {
                                    x: e.iconSx,
                                    y: e.iconSy
                                }
                            }),
                            t
                        }
                        onWeaponProps(e, t) {
                            let i = this.weaponProps;
                            if ("checkbox" == e.target.type.toLowerCase())
                                i[t] = e.target.checked;
                            else {
                                let a = e.target.value;
                                if ("number" == e.target.type) {
                                    let e = Number(a);
                                    if (isNaN(e))
                                        return;
                                    a = e
                                }
                                i[t] = a
                            }
                            this.updateWeaponProps(!0)
                        }
                        renderPropInput(e, t) {
                            return t = Object.assign({
                                inputType: "text",
                                step: 1
                            }, t || {}),
                            React.createElement(MaterialUI.TextField, {
                                type: t.inputType,
                                label: s("weaponEditor.prop." + e),
                                variant: "outlined",
                                value: this.state.weaponProps[e],
                                onChange: t => this.onWeaponProps(t, e),
                                InputProps: {
                                    endAdornment: t.unit && React.createElement(MaterialUI.InputAdornment, {
                                        position: "end"
                                    }, t.unit)
                                },
                                inputProps: {
                                    step: t.step,
                                    min: t.min || 0
                                }
                            })
                        }
                        renderAnimTypes() {
                            return React.createElement("div", {
                                className: this.props.classes.animType
                            }, React.createElement(MaterialUI.FormControl, {
                                className: "clipAlias"
                            }, React.createElement(MaterialUI.InputLabel, null, s("weaponEditor.prop.animType")), React.createElement(MaterialUI.Select, {
                                value: this.weaponProps.animType,
                                onChange: this.onAnimTypeChange
                            }, u.map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e.code,
                                value: e.code,
                                className: this.props.classes.aliasItem
                            }, React.createElement("img", {
                                src: this.state.animTypeImages[e.code],
                                height: "48"
                            })))))), React.createElement(MaterialUI.IconButton, {
                                variant: "outlined",
                                color: "secondary",
                                size: "large",
                                onClick: this.onBtnApplyAnimTypeDefaults
                            }, React.createElement(MaterialUI.Icon, null, "restart_alt")))
                        }
                        onAliasChange(e, t) {
                            let i = t.target.value;
                            this.weaponProps[e] = i,
                            this.updateWeaponProps(!0)
                        }
                        renderClipAlias(t) {
                            let i = ["image", "twrole"]
                              , a = e.Base.listAppResourceAlias().filter((t => {
                                let a = e.Base.getAppResource(t);
                                return -1 != i.indexOf(a.type)
                            }
                            ));
                            return React.createElement(MaterialUI.FormControl, {
                                className: "clipAlias"
                            }, React.createElement(MaterialUI.InputLabel, null, s("weaponEditor.prop." + t)), React.createElement(MaterialUI.Select, {
                                value: this.weaponProps[t],
                                renderValue: e => e || s("weaponEditor.aliasDefault"),
                                onChange: e => this.onAliasChange(t, e)
                            }, React.createElement(MaterialUI.MenuItem, {
                                value: ""
                            }, s("weaponEditor.aliasDefault")), a.map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e,
                                value: e,
                                className: this.props.classes.aliasItem
                            }, e, React.createElement("img", {
                                src: this.getAliasThumb(e),
                                height: "48"
                            }))))))
                        }
                        getAliasThumb(t) {
                            let i = e.Base.getAppResource(t)
                              , a = i.meta;
                            return i.url + (a.thumb || a.main)
                        }
                        onToggleWiderPickTest() {
                            let e = this.weaponProps;
                            e.widerPickTest = !e.widerPickTest,
                            this.updateWeaponProps(!1)
                        }
                        renderEditor() {
                            return React.createElement("div", {
                                className: this.props.classes.editor
                            }, this.renderAnimTypes(), this.renderClipAlias("alias"), this.renderClipAlias("gunAlias"), React.createElement("div", {
                                className: "propRow noMargin"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: this.weaponProps.widerPickTest,
                                    onChange: e => this.onToggleWiderPickTest()
                                }),
                                label: s("weaponEditor.prop.widerPickTest")
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("baseDamage", {
                                inputType: "number"
                            }), this.renderPropInput("weight", {
                                inputType: "number",
                                step: .01
                            }), this.renderPropInput("maxBullets", {
                                inputType: "number",
                                min: 1
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("gunLength", {
                                inputType: "number",
                                min: 1
                            }), this.renderPropInput("scaleOnGround", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput("scaleOnIcon", {
                                inputType: "number",
                                step: .1
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("swapTime", {
                                inputType: "number",
                                min: 100,
                                unit: s("weaponEditor.ms")
                            }), this.renderPropInput("fireDelay", {
                                inputType: "number",
                                min: 100,
                                unit: s("weaponEditor.ms")
                            }), this.renderPropInput("reloadTime", {
                                inputType: "number",
                                min: 100,
                                unit: s("weaponEditor.ms")
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("minAimRange", {
                                inputType: "number",
                                step: .01,
                                min: .01
                            }), this.renderPropInput("maxAimRange", {
                                inputType: "number",
                                step: .01,
                                min: .01
                            }), this.renderPropInput("aimDistanceRangeRate", {
                                inputType: "number",
                                step: .01,
                                min: .01
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("shakeImpact", {
                                inputType: "number",
                                step: .01,
                                min: .01
                            }), this.renderPropInput("moveShakeRate", {
                                inputType: "number",
                                step: .01,
                                min: .01
                            }), this.renderPropInput("aimFocusRate", {
                                inputType: "number",
                                step: .01,
                                min: .01
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("pushPower", {
                                inputType: "number",
                                min: 0
                            }), this.renderPropInput("autoTimes", {
                                inputType: "number",
                                min: 0
                            }), (e = this.weaponProps.animType) && e == l.MINIGUN.code && this.renderPropInput("rotateRate", {
                                inputType: "number",
                                min: 0
                            })));
                            var e
                        }
                        renderSpriteInfo(e, t, i) {
                            let a = t && this.state.weaponProps[e + "Auto"]
                              , o = React.createElement("div", {
                                className: "propRow"
                            }, React.createElement(MaterialUI.Typography, {
                                className: "title"
                            }, s("weaponEditor.prop." + e)), t ? React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: a,
                                    onChange: t => this.onWeaponProps(t, e + "Auto")
                                }),
                                label: s("weaponEditor.prop." + e + "Auto")
                            }) : null);
                            return a ? React.createElement("div", {
                                className: "spriteInfo" + (i ? " noTitle" : "")
                            }, i || o) : React.createElement("div", {
                                className: "spriteInfo" + (i ? " noTitle" : "")
                            }, i || o, React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput(e + "X", {
                                inputType: "number"
                            }), this.renderPropInput(e + "Y", {
                                inputType: "number"
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput(e + "R", {
                                inputType: "number"
                            }), this.renderPropInput(e + "Sx", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput(e + "Sy", {
                                inputType: "number",
                                step: .1
                            })))
                        }
                        renderSpriteEditor() {
                            return React.createElement("div", {
                                className: this.props.classes.editor + " spriteInfo"
                            }, React.createElement(MaterialUI.Tabs, {
                                value: this.state.tabIndex,
                                onChange: this.onTabChange,
                                variant: "fullWidth"
                            }, React.createElement(MaterialUI.Tab, {
                                label: s("weaponEditor.prop.hand")
                            }), React.createElement(MaterialUI.Tab, {
                                label: s("weaponEditor.prop.reload")
                            })), 0 == this.state.tabIndex && this.renderSpriteInfo("hand", !1, !0), 1 == this.state.tabIndex && this.renderSpriteInfo("reload", !1, !0), this.renderSpriteInfo("icon", !1))
                        }
                        renderLoading() {
                            return React.createElement("div", {
                                className: this.props.classes.loading
                            }, React.createElement(MaterialUI.CircularProgress, {
                                color: "inherit"
                            }))
                        }
                        render() {
                            return React.createElement("div", {
                                className: this.props.classes.root
                            }, React.createElement("div", {
                                className: "sidebar top"
                            }), React.createElement("div", {
                                className: "sidebar left"
                            }), React.createElement("div", {
                                className: this.props.classes.controlBar
                            }, React.createElement(MaterialUI.Tooltip, {
                                title: s("weaponEditor.control.animation")
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.display.onKeyDown(r.F)
                            }, React.createElement(MaterialUI.Icon, null, "play_arrow"))), React.createElement(MaterialUI.Tooltip, {
                                title: s("weaponEditor.control.shootsAnim")
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.display.onKeyDown(r.C)
                            }, React.createElement(MaterialUI.Icon, null, "fast_forward"))), React.createElement(MaterialUI.Tooltip, {
                                title: s("weaponEditor.control.reloadAnim")
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.display.onKeyDown(r.R)
                            }, React.createElement(MaterialUI.Icon, null, "settings_backup_restore"))), React.createElement("div", {
                                className: "spacer"
                            }), React.createElement(MaterialUI.Tooltip, {
                                title: s("weaponEditor.control.switchWeapon")
                        }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.display.onKeyDown(r.Q)
                            }, React.createElement(MaterialUI.Icon, null, "cached")))), this.state.loading && this.renderLoading(), this.renderEditor(), this.renderSpriteEditor())
                        }
                    }
                    ,
                    t("FarWeaponEditor", d),
                    u = [l.HANDGUN, l.RIFLE, l.SNIPEGUN, l.SHOTGUN, l.DOUBLE_GUNS, l.ANAESTHETIC_RIFLE, l.ROCKET_LAUNCHER, l.FLAME_THROWER, l.LASER_GUN, l.MINIGUN]
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/throwableEditor/ThrowableWeaponEditor", ["../weaponeditor/WeaponEditor", "./ThrowableWeaponEditorDisplay"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g, f, I = this && this.__awaiter || function(e, t, i, a) {
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
            function w(t) {
                return I(this, void 0, void 0, (function*() {
                    if (t.code.startsWith("firework")) {
                        let i = d.createGAFMovieClip(t.clipAlias, t.clip);
                        i.gotoAndStop(t.code),
                        i.scale.set(.75);
                        let a = i.getBounds(!1);
                        return i.x = -a.x,
                        i.y = -a.y,
                        e.Base.pixi.displayObjectToDataUrl(i, {
                            mime: "image/png",
                            bgAlpha: 0
                        })
                    }
                    return c.resourceToImageDataUrl(t.clip, t.clipAlias)
                }
                ))
            }
            function R(e, t) {
                return t.throwType = e.code,
                b(e, t)
            }
            function b(e, t) {
                return Object.assign(t, {
                    baseDamage: e.damage,
                    weight: e.weight,
                    swapTime: e.swapTime,
                    shadowRadius: "number" == typeof e.shadowRadius ? e.shadowRadius : 8,
                    explodeOnBounce: e.explodeOnBounce,
                    preventDefault: e.preventDefault,
                    noArrow: !!e.noArrow,
                    noSpin: !!e.noSpin
                })
            }
            function y(e) {
                return e.throwType.startsWith("grenade")
            }
            function E(e, t=0) {
                return Math.max(t, Math.round(e))
            }
            function C(e, t=.01) {
                return Math.max(t, e)
            }
            return t("showThrowableWeaponEditorScreen", (function(t) {
                u && !g || (g && g.handleClose(),
                u = e.ReactMaterial.renderComponentWithStyle(Object.assign(a.getWeaponEditorStyles(), {
                    throwType: {
                        display: "flex",
                        alignItems: "center",
                        "& .clipAlias": {
                            marginRight: 10,
                            width: 120,
                            "& img": {
                                height: 24,
                                marginLeft: 32
                            }
                        }
                    },
                    aliasItem: {
                        "& img": {
                            height: 24,
                            marginLeft: 24
                        }
                    }
                }), m, {
                    emitter: t.emitter,
                    appUsage: t.appUsage
                }),
                $(u).css("z-index", 100))
            }
            )),
            {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    o = e
                }
                ],
                execute: function() {
                    s = e.TwilightWarsLib.games.items.StuffType,
                    n = e.TwilightWarsLib.games.items.weapons.customs.CustomThrowableWeaponInfo,
                    r = e.Base.translation.translate,
                    l = e.Base.keyboard.Key,
                    c = e.TWLibLib.libs.utils.PixiUtil,
                    p = e.TwilightWarsLib.games.items.StuffInfo,
                    d = e.Base.resourceManager,
                    h = e.TWLibLib.games.effects.fireworks.FireworkColor,
                    m = class extends React.Component {
                        constructor(t) {
                            super(t),
                            this.display = new o.ThrowableWeaponEditorDisplay,
                            this.handleClose = () => {
                                e.React.unmountRootComponent(u),
                                u = null,
                                g = null
                            }
                            ,
                            this.onThrowTypeChange = e => {
                                this.weaponProps.throwType = e.target.value,
                                this.updateWeaponProps(!0)
                            }
                            ,
                            this.onBtnApplyThrowTypeDefaults = () => {
                                e.ReactMaterial.dialogs.openConfirmDialog({
                                    message: r("weaponEditor.applyWeaponDefaults"),
                                    confirmLabel: r("btn.confirm"),
                                    cancelLabel: r("btn.cancel"),
                                    onClose: e => {
                                        if (e) {
                                            R(p.getByCode(this.weaponProps.throwType), this.weaponProps),
                                            this.updateWeaponProps(!0)
                                        }
                                    }
                                })
                            }
                            ,
                            this.onToggleLimitPerGame = () => {
                                const e = this.weaponProps;
                                if (e.limitPerGame)
                                    e.limitPerGame = 0;
                                else {
                                    const t = p.getByCode(e.throwType);
                                    e.limitPerGame = t.limitPerGame
                                }
                                this.setState({
                                    weaponProps: e
                                })
                            }
                            ,
                            this.weaponProps = this.buildInitConfig(),
                            this.state = {
                                throwTypeImages: {},
                                loading: !0,
                                weaponProps: this.weaponProps
                            },
                            this.refreshDisplay(),
                            this.display.once("loaded", this.onDisplayLoaded, this)
                        }
                        onDisplayLoaded() {
                            this.setState({
                                loading: !1
                            })
                        }
                        buildInitConfig() {
                            let e = this.props.appUsage.initJson
                              , t = R(f[0], {
                                alias: "",
                                baseDamage: 1,
                                scaleOnGround: .8,
                                scaleOnIcon: 1,
                                widerPickTest: !0,
                                weight: 2.1,
                                swapTime: 150,
                                preventDefault: !1,
                                explodeOnBounce: !1,
                                shadowRadius: 8,
                                rotationOnWall: 0,
                                throwRotation: 0,
                                throwScale: 1,
                                throwDeltaScale: 0,
                                limitPerGame: 0,
                                noArrow: !1,
                                noSpin: !1,
                                handX: 0,
                                handY: 0,
                                handR: 0,
                                handSx: 1,
                                handSy: 1,
                                iconAuto: !1,
                                iconX: 0,
                                iconY: 0,
                                iconR: 0,
                                iconSx: 1,
                                iconSy: 1
                            });
                            if (e && e.throwType) {
                                const i = p.getByCode(e.throwType)
                                  , a = e;
                                t.throwType = a.throwType,
                                t.alias = a.clipAlias,
                                t.scaleOnGround = a.scaleOnGround,
                                t.scaleOnIcon = a.scaleOnIcon || 1,
                                t.widerPickTest = "wider" == a.pickTestFunc,
                                t.rotationOnWall = a.rotationOnWall || 0,
                                t.throwRotation = a.throwRotation || 0,
                                t.throwScale = a.throwScale || 1,
                                t.throwDeltaScale = a.throwDeltaScale || 0,
                                t.limitPerGame = a.limitPerGame && a.limitPerGame != i.limitPerGame ? a.limitPerGame : 0,
                                b(a, t);
                                let o = a.sprite;
                                o && (o.pivotOnHand && (t.handX = o.pivotOnHand.x,
                                t.handY = o.pivotOnHand.y,
                                t.handR = o.pivotOnHand.degrees,
                                t.handSx = o.pivotOnHand.scale.x,
                                t.handSy = o.pivotOnHand.scale.y),
                                o.pivotOnIcon && (t.iconAuto = !1,
                                t.iconX = o.pivotOnIcon.x,
                                t.iconY = o.pivotOnIcon.y,
                                t.iconR = o.pivotOnIcon.degrees,
                                t.iconSx = o.pivotOnIcon.scale.x,
                                t.iconSy = o.pivotOnIcon.scale.y))
                            }
                            return t
                        }
                        componentDidMount() {
                            this.props.emitter.on("requestJson", this.onRequestJson, this),
                            function() {
                                return I(this, void 0, void 0, (function*() {
                                    let e = {};
                                    for (let t of f) {
                                        let i = yield w(t);
                                        e[t.code] = i
                                    }
                                    return e
                                }
                                ))
                            }().then((e => {
                                this.setState({
                                    throwTypeImages: e
                                })
                            }
                            ))
                        }
                        componentWillUnmount() {
                            this.props.emitter.off("requestJson", this.onRequestJson, this)
                        }
                        onRequestJson(e) {
                            e.json = this.exportWeaponInfo()
                        }
                        updateWeaponProps(e) {
                            this.setState({
                                weaponProps: this.weaponProps
                            }),
                            e && this.refreshDisplay()
                        }
                        refreshDisplay() {
                            this.display.setWeaponInfo(this.exportWeaponInfo())
                        }
                        exportWeaponInfo() {
                            const e = this.weaponProps;
                            p.getByCode(e.throwType);
                            let t = n.createConfig({
                                throwType: e.throwType,
                                sprite: {
                                    pivotOnHand: {
                                        x: e.handX,
                                        y: e.handY,
                                        degrees: e.handR,
                                        scale: {
                                            x: e.handSx,
                                            y: e.handSy
                                        }
                                    }
                                }
                            });
                            !function(e, t) {
                                Object.assign(t, {
                                    throwType: e.throwType,
                                    damage: E(e.baseDamage, 0),
                                    weight: C(e.weight, 0),
                                    swapTime: E(e.swapTime, 100),
                                    explodeOnBounce: y(e) && e.explodeOnBounce,
                                    preventDefault: e.preventDefault || void 0,
                                    shadowRadius: e.shadowRadius,
                                    noSpin: e.noSpin || void 0,
                                    noArrow: e.noArrow || void 0
                                }),
                                e.limitPerGame && e.limitPerGame != t.limitPerGame && (t.limitPerGame = e.limitPerGame)
                            }(this.weaponProps, t);
                            let i = {
                                clipAlias: e.alias || t.clipAlias,
                                scaleOnGround: e.scaleOnGround,
                                scaleOnIcon: e.scaleOnIcon,
                                pickTestFunc: e.widerPickTest ? "wider" : void 0,
                                rotationOnWall: e.rotationOnWall || void 0,
                                throwRotation: e.throwRotation || void 0,
                                throwScale: e.throwScale && 1 != e.throwScale ? e.throwScale : void 0,
                                throwDeltaScale: e.throwDeltaScale || void 0
                            };
                            return Object.assign(t, i),
                            e.iconAuto || (t.sprite.pivotOnIcon = {
                                x: e.iconX,
                                y: e.iconY,
                                degrees: e.iconR,
                                scale: {
                                    x: e.iconSx,
                                    y: e.iconSy
                                }
                            }),
                            t
                        }
                        onAliasChange(e, t) {
                            let i = t.target.value;
                            this.weaponProps[e] = i,
                            this.updateWeaponProps(!0)
                        }
                        renderClipAlias(t) {
                            let i = ["image", "twrole"]
                              , a = e.Base.listAppResourceAlias().filter((t => {
                                let a = e.Base.getAppResource(t);
                                return -1 != i.indexOf(a.type)
                            }
                            ));
                            return React.createElement(MaterialUI.FormControl, {
                                className: "clipAlias"
                            }, React.createElement(MaterialUI.InputLabel, null, r("weaponEditor.prop." + t)), React.createElement(MaterialUI.Select, {
                                value: this.weaponProps[t],
                                renderValue: e => e || r("weaponEditor.aliasDefault"),
                                onChange: e => this.onAliasChange(t, e)
                            }, React.createElement(MaterialUI.MenuItem, {
                                value: ""
                            }, r("weaponEditor.aliasDefault")), a.map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e,
                                value: e,
                                className: this.props.classes.aliasItem
                            }, e, React.createElement("img", {
                                src: this.getAliasThumb(e),
                                height: "48"
                            }))))))
                        }
                        getAliasThumb(t) {
                            let i = e.Base.getAppResource(t)
                              , a = i.meta;
                            return i.url + (a.thumb || a.main)
                        }
                        onToggleProps(e, t) {
                            let i = this.weaponProps;
                            i[e] = !i[e],
                            this.updateWeaponProps(t)
                        }
                        renderPropInput(e, t) {
                            return t = Object.assign({
                                inputType: "text",
                                step: 1
                            }, t || {}),
                            React.createElement(MaterialUI.TextField, {
                                type: t.inputType,
                                label: r("weaponEditor.prop." + e),
                                variant: "outlined",
                                value: this.state.weaponProps[e],
                                onChange: t => this.onWeaponProps(t, e),
                                InputProps: {
                                    endAdornment: t.unit && React.createElement(MaterialUI.InputAdornment, {
                                        position: "end"
                                    }, t.unit)
                                },
                                inputProps: {
                                    step: t.step,
                                    min: t.min || 0
                                }
                            })
                        }
                        onWeaponProps(e, t) {
                            let i = this.weaponProps;
                            if ("checkbox" == e.target.type.toLowerCase())
                                i[t] = e.target.checked;
                            else {
                                let a = e.target.value;
                                if ("number" == e.target.type) {
                                    let e = Number(a);
                                    if (isNaN(e))
                                        return;
                                    a = e
                                }
                                i[t] = a
                            }
                            this.updateWeaponProps(!0)
                        }
                        renderThrowTypes() {
                            return React.createElement("div", {
                                className: this.props.classes.throwType
                            }, React.createElement(MaterialUI.FormControl, {
                                className: "clipAlias"
                            }, React.createElement(MaterialUI.InputLabel, null, r("weaponEditor.prop.animType")), React.createElement(MaterialUI.Select, {
                                value: this.weaponProps.throwType,
                                onChange: this.onThrowTypeChange
                            }, f.map((e => React.createElement(MaterialUI.MenuItem, {
                                key: e.code,
                                value: e.code,
                                className: this.props.classes.aliasItem
                            }, React.createElement("img", {
                                src: this.state.throwTypeImages[e.code],
                                height: "48"
                            })))))), React.createElement(MaterialUI.IconButton, {
                                variant: "outlined",
                                color: "secondary",
                                size: "large",
                                onClick: this.onBtnApplyThrowTypeDefaults
                            }, React.createElement(MaterialUI.Icon, null, "restart_alt")))
                        }
                        renderEditor() {
                            const e = this.weaponProps
                              , t = e.throwType || s.GRENADE_BOMB.code;
                            return React.createElement("div", {
                                className: this.props.classes.editor
                            }, this.renderThrowTypes(), this.renderClipAlias("alias"), React.createElement("div", {
                                className: "propRow noMargin"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: e.widerPickTest,
                                    onChange: e => this.onToggleProps("widerPickTest")
                                }),
                                label: r("weaponEditor.prop.widerPickTest")
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("baseDamage", {
                                inputType: "number"
                            }), this.renderPropInput("weight", {
                                inputType: "number",
                                step: .01
                            }), this.renderPropInput("swapTime", {
                                inputType: "number",
                                min: 100,
                                unit: r("weaponEditor.ms")
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("shadowRadius", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput("scaleOnGround", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput("scaleOnIcon", {
                                inputType: "number",
                                step: .1
                            })), t.includes("esBall") && React.createElement("div", {
                                className: "propRow noMargin"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: e.noSpin,
                                    onChange: e => this.onToggleProps("noSpin", !0)
                                }),
                                label: r("weaponEditor.prop.noSpin")
                            }), React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: e.noArrow,
                                    onChange: e => this.onToggleProps("noArrow", !0)
                                }),
                                label: r("weaponEditor.prop.noArrow")
                            })), "hatchet" == t && e.alias && React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("rotationOnWall", {
                                inputType: "number",
                                step: 1,
                                unit: "\xb0"
                            })), h.getByCode(t) && e.alias && React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput("throwRotation", {
                                inputType: "number",
                                step: 1,
                                unit: "\xb0"
                            }), this.renderPropInput("throwScale", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput("throwDeltaScale", {
                                inputType: "number",
                                step: .1
                            })), React.createElement("div", {
                                className: "propRow noMargin"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: e.preventDefault,
                                    onChange: e => this.onToggleProps("preventDefault")
                                }),
                                label: r("weaponEditor.prop.preventDefault")
                            })), y(e) && React.createElement("div", {
                                className: "propRow noMargin"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: e.explodeOnBounce,
                                    onChange: e => this.onToggleProps("explodeOnBounce")
                                }),
                                label: r("weaponEditor.prop.explodeOnBounce")
                            })), React.createElement("div", {
                                className: "propRow noMargin"
                            }, React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: e.limitPerGame,
                                    onChange: e => this.onToggleLimitPerGame()
                                }),
                                label: r("weaponEditor.prop.setLimitPerGame")
                            })), e.limitPerGame ? React.createElement("div", {
                                className: "propRow leftMargin noMarginTop"
                            }, this.renderPropInput("limitPerGame", {
                                inputType: "number",
                                step: 1,
                                min: 1,
                                unit: r("weaponEditor.perGame")
                            })) : null)
                        }
                        renderSpriteInfo(e, t, i) {
                            let a = t && this.state.weaponProps[e + "Auto"]
                              , o = React.createElement("div", {
                                className: "propRow"
                            }, React.createElement(MaterialUI.Typography, {
                                className: "title"
                            }, r("weaponEditor.prop." + e)), t ? React.createElement(MaterialUI.FormControlLabel, {
                                control: React.createElement(MaterialUI.Checkbox, {
                                    checked: a,
                                    onChange: t => this.onWeaponProps(t, e + "Auto")
                                }),
                                label: r("weaponEditor.prop." + e + "Auto")
                            }) : null);
                            return a ? React.createElement("div", {
                                className: "spriteInfo" + (i ? " noTitle" : "")
                            }, i || o) : React.createElement("div", {
                                className: "spriteInfo" + (i ? " noTitle" : "")
                            }, i || o, React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput(e + "X", {
                                inputType: "number"
                            }), this.renderPropInput(e + "Y", {
                                inputType: "number"
                            })), React.createElement("div", {
                                className: "propRow"
                            }, this.renderPropInput(e + "R", {
                                inputType: "number"
                            }), this.renderPropInput(e + "Sx", {
                                inputType: "number",
                                step: .1
                            }), this.renderPropInput(e + "Sy", {
                                inputType: "number",
                                step: .1
                            })))
                        }
                        renderSpriteEditor() {
                            return React.createElement("div", {
                                className: this.props.classes.editor + " spriteInfo"
                            }, this.renderSpriteInfo("hand", !1), this.renderSpriteInfo("icon", !1))
                        }
                        renderLoading() {
                            return React.createElement("div", {
                                className: this.props.classes.loading
                            }, React.createElement(MaterialUI.CircularProgress, {
                                color: "inherit"
                            }))
                        }
                        render() {
                            return React.createElement("div", {
                                className: this.props.classes.root
                            }, React.createElement("div", {
                                className: "sidebar top"
                            }), React.createElement("div", {
                                className: "sidebar left"
                            }), React.createElement("div", {
                                className: this.props.classes.controlBar
                            }, React.createElement(MaterialUI.Tooltip, {
                                title: r("weaponEditor.control.animation")
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.display.onKeyDown(l.F)
                            }, React.createElement(MaterialUI.Icon, null, "play_arrow"))), React.createElement("div", {
                                className: "spacer"
                            }), React.createElement(MaterialUI.Tooltip, {
                                title: r("weaponEditor.control.switchWeapon")
                            }, React.createElement(MaterialUI.IconButton, {
                                onClick: () => this.display.onKeyDown(l.Q)
                            }, React.createElement(MaterialUI.Icon, null, "cached")))), this.state.loading && this.renderLoading(), this.renderEditor(), this.state.weaponProps.alias && this.renderSpriteEditor())
                        }
                    }
                    ,
                    t("ThrowableWeaponEditor", m),
                    f = [s.GRENADE_BOMB, s.GRENADE_STUN, s.GRENADE_SMOKE, s.GRENADE_FIRE, s.HATCHET, s.ES_BALL, s.ES_BALL1, s.ES_BALL2, s.FIREWORK_WHITE, s.FIREWORK_BLACK, s.FIREWORK_RAINBOW, s.FIREWORK_RED, s.FIREWORK_ORANGE, s.FIREWORK_YELLOW, s.FIREWORK_GREEN, s.FIREWORK_BLUE, s.FIREWORK_INDIGO, s.FIREWORK_PURPLE]
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
                    e.Base.translation.getTranslation(e.Base.locales.LANG.EN).importJson({
                        label: {
                            officialRoles: "Twilight Wars Roles",
                            userRoles: "User Made Roles",
                            mapWeapons: "Map Weapons",
                            shopWeapons: "Shop Weapons",
                            legendWeapons: "Legend Weapons",
                            customWeapons: "Custom Weapons",
                            missionItems: "Mission Items",
                            storeItems: "Stop Items",
                            bookItems: "Books",
                            customItems: "Custom Items",
                            default: "Default",
                            empty: "not set",
                            allowMultiple: "Multiple (max {{max}})"
                        },
                        btn: {
                            confirm: "Confirm",
                            cancel: "Cancel"
                        },
                        mapblock: {
                            emptyList: "No block is available in this map."
                        },
                        message: {
                            noWeapon: "No custom weapons found...",
                            notDoneYet: "Under construction..."
                        },
                        roleEditor: {
                            title: "Role Editor",
                            tab: {
                                deco: "Deco",
                                head: "Head",
                                hand: "Hand",
                                foot: "Foot",
                                cape: "Cape"
                            },
                            btn: {
                                importRole: "Import",
                                downloadRole: "Download",
                                buildRole: "New Design",
                                buildRoleTip: "Open Role Editor",
                                gotit: "Got it!",
                                saveRole: "Save",
                                buySlot: "Buy Slot",
                                buySlotAgain: "Buy"
                            },
                            hotkey: {
                                rotate: "Hotkey: C/V",
                                scale: "Hotkey: Z/X",
                                ratio: "Hotkey: shift + Z/X"
                            },
                            noDesigns: "No custom design imported",
                            buildRole: "Role Editor provides the tools to build your own charactor designs for your game. Once the design is build and saved in a .twrole file, upload the file to CG Resource, and you can assign the design to an AI in TwilightWarsEvents editor.",
                            requireItemToSave: "You need to purchase this save slot to store your character.",
                            requireItemToSaveAgain: "You need to purchase the editor of this slot to edit your character again.",
                            roleModifed: "The design you have just uploaded was modified to fit the Camp.",
                            labelBuyPrice: "Price",
                            labelBuyAgainPrice: "Buy Again at",
                            allowMultiSelect: "Hold Ctrl to add selection"
                        },
                        gender: {
                            male: "Male",
                            female: "Female"
                        },
                        weaponEditor: {
                            control: {
                                switchWeapon: "Switch (Q)",
                                animation: "Fire (F)",
                                comboAnim: "Combo (C)",
                                reloadAnim: "Reload (R)",
                                shootsAnim: "Shoots (C)"
                            },
                            prop: {
                                animType: "Animation",
                                alias: "Resource Alias",
                                gunAlias: "Gun On Hand",
                                baseDamage: "Base Damage",
                                weight: "Weight",
                                swapTime: "Switch Duration",
                                widerPickTest: "Enlarge pickable area",
                                gunLength: "Gun Length",
                                reloadTime: "Reload Duration",
                                minAimRange: "Min. Aim",
                                maxAimRange: "Max. Aim",
                                shakeImpact: "Aim Fire-Impact",
                                moveShakeRate: "Aim Move-Impact",
                                aimFocusRate: "Aim Focus Rate",
                                aimDistanceRangeRate: "Aim Distant Rate",
                                fireDelay: "Fire Interval",
                                maxBullets: "Bullets",
                                pushPower: "Push Back Power",
                                autoTimes: "Burst Times",
                                rotateRate: "Turning Rate",
                                hand: "On hand Shift",
                                handX: "Pivot X",
                                handY: "Pivot Y",
                                handR: "Degrees",
                                handSx: "Scale X",
                                handSy: "Scale Y",
                                reload: "On Reload Shift",
                                reloadX: "Pivot X",
                                reloadY: "Pivot Y",
                                reloadR: "Degrees",
                                reloadSx: "Scale X",
                                reloadSy: "Scale Y",
                                icon: "On icon Shift",
                                iconX: "Pivot X",
                                iconY: "Pivot Y",
                                iconR: "Degrees",
                                iconSx: "Scale X",
                                iconSy: "Scale Y",
                                iconAuto: "Auto",
                                iconShiftX: "UI shift X",
                                iconShiftY: "UI shift Y",
                                itemScaleOnIcon: "UI scale",
                                scaleOnGround: "On ground scale",
                                scaleOnIcon: "Icon scale",
                                fireInfos: "Attack Modes",
                                deltaDamage: "Delta Damage",
                                fireType: "Animation",
                                fireFirst: "First",
                                fireCombo: "Combo {{index}}",
                                equippable: "Wearable",
                                float: "Float Animation",
                                floatSpeed: "Float Frequency",
                                floatScale: "Float Scale",
                                radius: "Orbit Radius",
                                orbitSpeed: "Orbit Speed",
                                rotateSpeed: "Rotate Speed",
                                preventDefault: "Disable default explode behavior",
                                explodeOnBounce: "Explode on touching ground",
                                shadowRadius: "Shadow Radius",
                                rotationOnWall: "Rotation on wall",
                                throwRotation: "Rotation in air",
                                throwScale: "Scale in air",
                                throwDeltaScale: "Delta scale",
                                setLimitPerGame: "Overwrite limit per game",
                                limitPerGame: "Limit",
                                noSpin: "No Spin in air",
                                noArrow: "No Arrow Indicator"
                            },
                            btnAddCombo: "Add Combo",
                            aliasDefault: "Default",
                            ms: "ms",
                            perGame: "/game",
                            btnAddWeapon: "Design New Weapon",
                            customWeaponTip: "You can find the custom weapon editor in the TwilightWars configs.",
                            btnAddItem: "Design New Item",
                            customItemTip: "You can find the custom item editor in the TwilightWars configs.",
                            applyWeaponDefaults: "Apply default values of the reference weapon (will overwrite current values)?"
                        },
                        itemEditor: {
                            updateType: {
                                still: "Still",
                                followHead: "Sync to Head rotation",
                                followCape: "Sync to Cape rotation",
                                followVelocity: "Sync to Move direction",
                                followFeet: "Sync to Feet rotation",
                                orbit: "Orbit around the body"
                            }
                        },
                        "tw.label.civilFull": "Campless"
                    })
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
                    e.Base.translation.getTranslation(e.Base.locales.LANG.ZH).importJson({
                        label: {
                            officialRoles: "\u5b98\u65b9\u89d2\u8272",
                            userRoles: "\u540c\u4eba\u89d2\u8272",
                            mapWeapons: "\u5730\u5716\u6b66\u5668",
                            shopWeapons: "\u5546\u5e97\u6b66\u5668",
                            legendWeapons: "\u50b3\u8aaa\u6b66\u5668",
                            customWeapons: "\u81ea\u88fd\u6b66\u5668",
                            missionItems: "\u4efb\u52d9\u9053\u5177",
                            storeItems: "\u5546\u5e97\u9053\u5177",
                            bookItems: "\u529f\u592b\u79d8\u7b08",
                            customItems: "\u81ea\u88fd\u9053\u5177",
                            default: "\u9810\u8a2d",
                            empty: "\u672a\u6307\u5b9a",
                            allowMultiple: "\u591a\u9078(\u6700\u591a{{max}})"
                        },
                        btn: {
                            confirm: "\u78ba\u5b9a",
                            cancel: "\u53d6\u6d88"
                        },
                        mapblock: {
                            emptyList: "\u9019\u5f35\u5730\u5716\u6c92\u6709\u53ef\u63a8\u65b9\u584a\u53ef\u9078\u3002"
                        },
                        message: {
                            noWeapon: "\u5c1a\u672a\u8a2d\u5b9a\u81ea\u88fd\u6b66\u5668...",
                            noItem: "\u5c1a\u672a\u8a2d\u5b9a\u81ea\u88fd\u9053\u5177...",
                            notDoneYet: "\u9084\u6c92\u505a\u597d..."
                        },
                        roleEditor: {
                            title: "\u5149\u6688\u89d2\u8272\u5de5\u574a",
                            tab: {
                                deco: "\u982d\u98fe",
                                head: "\u982d\u578b",
                                hand: "\u624b",
                                foot: "\u8173",
                                cape: "\u62ab\u98a8"
                            },
                            btn: {
                                importRole: "\u8f09\u5165\u89d2\u8272",
                                downloadRole: "\u4e0b\u8f09\u6a94\u6848",
                                buildRole: "\u5275\u4f5c\u89d2\u8272",
                                buildRoleTip: "\u6253\u958b\u5149\u6688\u89d2\u8272\u5de5\u574a",
                                gotit: "\u77e5\u9053\u4e86\uff01",
                                saveRole: "\u5132\u5b58\u89d2\u8272",
                                buySlot: "\u8cfc\u8cb7\u5132\u5b58\u683c",
                                buySlotAgain: "\u8cfc\u8cb7"
                            },
                            hotkey: {
                                rotate: "\u71b1\u9375: C/V",
                                scale: "\u71b1\u9375: Z/X",
                                ratio: "\u71b1\u9375: shift + Z/X"
                            },
                            noDesigns: "\u5c1a\u672a\u8f09\u5165\u81ea\u88fd\u89d2\u8272",
                            buildRole: "\u5149\u6688\u89d2\u8272\u5de5\u574a\u53ef\u4f9b\u904a\u6232\u8a2d\u8a08\u5e2b\u88fd\u4f5c\u904a\u6232\u4e2d\u9700\u8981\u7528\u5230\u7684\u81ea\u5275\u89d2\u8272\u9020\u578b\u3002\u5b8c\u6210\u4e26\u4e0b\u8f09\u89d2\u8272\u6a94\u6848(.twrole)\u5f8c\uff0c\u518d\u5229\u7528CG\u4e0a\u50b3\u8cc7\u6e90\u7684\u529f\u80fd\uff0c\u5c07\u89d2\u8272\u8f09\u5165\u5c08\u6848\u8cc7\u6e90\u5f8c\uff0c\u5c31\u53ef\u4ee5\u5728\u9019\u88cf\u9078\u64c7\u81ea\u5275\u7684\u89d2\u8272\u9020\u578b\u4e86\u3002",
                            requireItemToSave: "\u9700\u8981\u8cfc\u8cb7\u9019\u500b\u89d2\u8272\u5132\u5b58\u683c\uff0c\u624d\u80fd\u5132\u5b58\u60a8\u7684\u81ea\u5275\u89d2\u8272\u3002",
                            requireItemToSaveAgain: "\u9700\u8981\u8cfc\u8cb7\u9019\u500b\u89d2\u8272\u5132\u5b58\u683c\u7684\u7de8\u8f2f\u5668\uff0c\u624d\u80fd\u518d\u6b21\u7de8\u8f2f\u60a8\u7684\u81ea\u5275\u89d2\u8272\u3002",
                            roleModifed: "\u60a8\u4e0a\u50b3\u7684\u89d2\u8272\u9020\u578b\u5df2\u88ab\u4fee\u6539\u4ee5\u7b26\u5408\u76ee\u524d\u7684\u9663\u71df\u8a2d\u5b9a\u3002",
                            labelBuyPrice: "\u9996\u8cfc\u50f9",
                            labelBuyAgainPrice: "\u518d\u6b21\u8cfc\u8cb7\u7279\u50f9",
                            allowMultiSelect: "\u6309\u4f4f Ctrl \u53ef\u52a0\u9078"
                        },
                        gender: {
                            male: "\u7537\u6027",
                            female: "\u5973\u6027"
                        },
                        weaponEditor: {
                            control: {
                                switchWeapon: "\u63db\u6b66\u5668(Q)",
                                animation: "\u653b\u64ca\u52d5\u756b(F)",
                                comboAnim: "\u9023\u64ca\u52d5\u756b(C)",
                                reloadAnim: "\u88dd\u586b\u52d5\u756b (R)",
                                shootsAnim: "\u9023\u7e8c\u5c04\u64ca (C)"
                            },
                            prop: {
                                animType: "\u52d5\u756b\u53c3\u8003",
                                alias: "\u6b66\u5668\u5716\u6a23\u8cc7\u6e90",
                                gunAlias: "\u624b\u6301\u5716\u6a23\u8cc7\u6e90",
                                baseDamage: "\u57fa\u790e\u653b\u64ca\u529b",
                                weight: "\u91cd\u91cf",
                                swapTime: "\u63db\u6b66\u5668\u6642\u9593",
                                widerPickTest: "\u589e\u52a0\u53ef\u62fe\u53d6\u7684\u7bc4\u570d",
                                gunLength: "\u69cd\u53e3\u8ddd\u96e2",
                                reloadTime: "\u88dd\u586b\u5f48\u85e5\u6642\u9593",
                                minAimRange: "\u6700\u5c0f\u6e96\u5fc3",
                                maxAimRange: "\u6700\u5927\u6e96\u5fc3",
                                shakeImpact: "\u5c04\u64ca\u6e96\u5fc3\u8b8a\u5316",
                                moveShakeRate: "\u79fb\u52d5\u6e96\u5fc3\u8b8a\u5316",
                                aimFocusRate: "\u6e96\u5fc3\u56de\u5fa9\u7387",
                                aimDistanceRangeRate: "\u9060\u8655\u6e96\u5fc3\u500d\u7387",
                                fireDelay: "\u5c04\u64ca\u9593\u8ddd",
                                maxBullets: "\u5f48\u5323\u7a7a\u9593",
                                pushPower: "\u64ca\u9000\u529b",
                                autoTimes: "\u9023\u5c04\u6b21\u6578",
                                rotateRate: "\u8f49\u8eab\u901f\u7387",
                                hand: "\u62ff\u5728\u624b\u4e0a\u7684\u504f\u79fb\u8abf\u6574",
                                handX: "\u9328\u9edeX",
                                handY: "\u9328\u9edeY",
                                handR: "\u89d2\u5ea6",
                                handSx: "\u7e2e\u653eX",
                                handSy: "\u7e2e\u653eY",
                                reload: "\u88dd\u586b\u5f48\u85e5\u7684\u504f\u79fb\u8abf\u6574",
                                reloadX: "\u9328\u9edeX",
                                reloadY: "\u9328\u9edeY",
                                reloadR: "\u89d2\u5ea6",
                                reloadSx: "\u7e2e\u653eX",
                                reloadSy: "\u7e2e\u653eY",
                                icon: "\u7576\u4f5c\u5716\u793a\u7684\u504f\u79fb\u8abf\u6574",
                                iconX: "\u9328\u9edeX",
                                iconY: "\u9328\u9edeY",
                                iconR: "\u89d2\u5ea6",
                                iconSx: "\u7e2e\u653eX",
                                iconSy: "\u7e2e\u653eY",
                                iconAuto: "\u81ea\u52d5\u8a2d\u5b9a",
                                iconShiftX: "\u8a08\u6578\u5668\u5716\u793a\u5e73\u79fbX",
                                iconShiftY: "\u8a08\u6578\u5668\u5716\u793a\u5e73\u79fbY",
                                itemScaleOnIcon: "\u8a08\u6578\u5668\u5716\u793a\u7684\u7e2e\u653e\u503c",
                                scaleOnGround: "\u653e\u5730\u4e0a\u6642\u7684\u7e2e\u653e\u503c",
                                scaleOnIcon: "\u53f3\u4e0a\u5716\u793a\u7684\u7e2e\u653e\u503c",
                                fireInfos: "\u653b\u64ca\u6a21\u5f0f\u8a2d\u5b9a",
                                deltaDamage: "\u653b\u64ca\u529b\u8b8a\u5316",
                                fireType: "\u653b\u64ca\u52d5\u756b",
                                fireFirst: "\u7b2c\u4e00\u64ca",
                                fireCombo: "\u7b2c{{index}}\u9023\u64ca",
                                equippable: "\u53ef\u88dd\u5099\u5728\u8eab\u4e0a",
                                float: "\u98c4\u6d6e\u52d5\u756b",
                                floatSpeed: "\u98c4\u6d6e\u52d5\u756b\u983b\u7387",
                                floatScale: "\u98c4\u6d6e\u52d5\u756b\u5927\u5c0f",
                                radius: "\u516c\u8f49\u534a\u5f91",
                                orbitSpeed: "\u516c\u8f49\u901f\u5ea6",
                                rotateSpeed: "\u81ea\u8f49\u901f\u5ea6",
                                preventDefault: "\u53d6\u6d88\u9810\u8a2d\u7684\u7206\u70b8\u884c\u70ba",
                                explodeOnBounce: "\u63a5\u89f8\u5730\u9762\u5373\u7206\u70b8",
                                shadowRadius: "\u5f71\u5b50\u534a\u5f91",
                                rotationOnWall: "\u5361\u5728\u7246\u4e0a\u7684\u89d2\u5ea6",
                                throwRotation: "\u98db\u884c\u4e2d\u7684\u89d2\u5ea6\u8abf\u6574",
                                throwScale: "\u98db\u884c\u4e2d\u7684\u7e2e\u653e\u8abf\u6574",
                                throwDeltaScale: "\u98db\u884c\u4e2d\u7684\u7e2e\u653e\u8b8a\u5316",
                                setLimitPerGame: "\u81ea\u8a02\u6bcf\u5834\u6230\u9b25\u6700\u591a\u4f7f\u7528\u6b21\u6578",
                                limitPerGame: "\u4f7f\u7528\u6b21\u6578\u9650\u5236",
                                noSpin: "\u5728\u7a7a\u4e2d\u4e0d\u65cb\u8f49",
                                noArrow: "\u4e0d\u986f\u793a\u5b9a\u4f4d\u7bad\u982d"
                            },
                            btnAddCombo: "\u589e\u52a0\u9023\u64ca",
                            aliasDefault: "\u9810\u8a2d\u5716\u6a23",
                            ms: "\u6beb\u79d2",
                            perGame: "/\u5834",
                            btnAddWeapon: "\u65b0\u589e\u81ea\u5275\u6b66\u5668",
                            customWeaponTip: "\u5728\u4e8b\u4ef6\u8868\u9802\u7aef\u7684\u300c\u5149\u6688\u6230\u8a18\u904a\u6232\u8a2d\u5b9a\u300d\u4e2d\u6709\u4e00\u5340\u53ef\u4ee5\u8a2d\u8a08\u81ea\u88fd\u6b66\u5668\u3002\u8a2d\u8a08\u597d\u7684\u6b66\u5668\u5c31\u6703\u51fa\u73fe\u5728\u9019\u5152\u6210\u70ba\u9078\u9805\u3002",
                            btnAddItem: "\u65b0\u589e\u81ea\u5275\u9053\u5177",
                            customItemTip: "\u5728\u4e8b\u4ef6\u8868\u9802\u7aef\u7684\u300c\u5149\u6688\u6230\u8a18\u904a\u6232\u8a2d\u5b9a\u300d\u4e2d\u6709\u4e00\u5340\u53ef\u4ee5\u8a2d\u8a08\u81ea\u88fd\u9053\u5177\u3002\u8a2d\u8a08\u597d\u7684\u9053\u5177\u5c31\u6703\u51fa\u73fe\u5728\u9019\u5152\u6210\u70ba\u9078\u9805\u3002",
                            applyWeaponDefaults: "\u4f7f\u7528\u53c3\u8003\u6b66\u5668\u7684\u6240\u6709\u6578\u503c\uff08\u5c07\u6703\u8986\u84cb\u76ee\u524d\u7684\u6578\u503c\uff09\uff1f"
                        },
                        itemEditor: {
                            updateType: {
                                still: "\u4e0d\u65cb\u8f49",
                                followHead: "\u8ddf\u8457\u9762\u5411\u65cb\u8f49",
                                followCape: "\u8ddf\u8457\u62ab\u98a8\u65cb\u8f49",
                                followVelocity: "\u8ddf\u8457\u524d\u9032\u65b9\u5411\u65cb\u8f49",
                                followFeet: "\u8ddf\u8457\u8173\u6b65\u65cb\u8f49",
                                orbit: "\u7e5e\u8457\u89d2\u8272\u65cb\u8f49"
                            }
                        },
                        "tw.label.civilFull": "\u7121\u95dc\u9663\u71df"
                    })
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
                    e.Base.translation.getTranslation(e.Base.locales.LANG.ZH_CN).importJson({
                        label: {
                            officialRoles: "\u5b98\u65b9\u89d2\u8272",
                            userRoles: "\u540c\u4eba\u89d2\u8272",
                            mapWeapons: "\u5730\u56fe\u6b66\u5668",
                            shopWeapons: "\u5546\u5e97\u6b66\u5668",
                            legendWeapons: "\u4f20\u8bf4\u6b66\u5668",
                            customWeapons: "\u81ea\u5236\u6b66\u5668",
                            missionItems: "\u4efb\u52a1\u9053\u5177",
                            storeItems: "\u5546\u5e97\u9053\u5177",
                            bookItems: "\u529f\u592b\u79d8\u7b08",
                            customItems: "\u81ea\u5236\u9053\u5177",
                            default: "\u9884\u8bbe",
                            empty: "\u672a\u6307\u5b9a",
                            allowMultiple: "\u591a\u9009(\u6700\u591a{{max}})"
                        },
                        btn: {
                            confirm: "\u786e\u5b9a",
                            cancel: "\u53d6\u6d88"
                        },
                        mapblock: {
                            emptyList: "\u8fd9\u5f20\u5730\u56fe\u6ca1\u6709\u53ef\u63a8\u65b9\u5757\u53ef\u9009\u3002 "
                        },
                        message: {
                            noWeapon: "\u5c1a\u672a\u8bbe\u5b9a\u81ea\u5236\u6b66\u5668...",
                            noItem: "\u5c1a\u672a\u8bbe\u5b9a\u81ea\u5236\u9053\u5177...",
                            notDoneYet: "\u8fd8\u6ca1\u505a\u597d..."
                        },
                        roleEditor: {
                            title: "\u5149\u6655\u89d2\u8272\u5de5\u574a",
                            tab: {
                                deco: "\u5934\u9970",
                                head: "\u5934\u578b",
                                hand: "\u624b",
                                foot: "\u811a",
                                cape: "\u62ab\u98ce"
                            },
                            btn: {
                                importRole: "\u8f7d\u5165\u89d2\u8272",
                                downloadRole: "\u4e0b\u8f7d\u6863\u6848",
                                buildRole: "\u521b\u4f5c\u89d2\u8272",
                                buildRoleTip: "\u6253\u5f00\u5149\u6655\u89d2\u8272\u5de5\u574a",
                                gotit: "\u77e5\u9053\u4e86\uff01 ",
                                saveRole: "\u50a8\u5b58\u89d2\u8272",
                                buySlot: "\u8d2d\u4e70\u50a8\u5b58\u683c",
                                buySlotAgain: "\u8d2d\u4e70"
                            },
                            hotkey: {
                                rotate: "\u70ed\u952e: C/V",
                                scale: "\u70ed\u952e: Z/X",
                                ratio: "\u70ed\u952e: shift + Z/X"
                            },
                            noDesigns: "\u5c1a\u672a\u8f7d\u5165\u81ea\u5236\u89d2\u8272",
                            buildRole: "\u5149\u6655\u89d2\u8272\u5de5\u574a\u53ef\u4f9b\u6e38\u620f\u8bbe\u8ba1\u5e08\u5236\u4f5c\u6e38\u620f\u4e2d\u9700\u8981\u7528\u5230\u7684\u81ea\u521b\u89d2\u8272\u9020\u578b\u3002\u5b8c\u6210\u5e76\u4e0b\u8f7d\u89d2\u8272\u6863\u6848(.twrole)\u540e\uff0c\u518d\u5229\u7528CG\u4e0a\u4f20\u8d44\u6e90\u7684\u529f\u80fd\uff0c\u5c06\u89d2\u8272\u8f7d\u5165\u4e13\u6848\u8d44\u6e90\u540e\uff0c\u5c31\u53ef\u4ee5\u5728\u8fd9\u91cc\u9009\u62e9\u81ea\u521b\u7684\u89d2\u8272\u9020\u578b\u4e86\u3002 ",
                            requireItemToSave: "\u9700\u8981\u8d2d\u4e70\u8fd9\u4e2a\u89d2\u8272\u50a8\u5b58\u683c\uff0c\u624d\u80fd\u50a8\u5b58\u60a8\u7684\u81ea\u521b\u89d2\u8272\u3002 ",
                            requireItemToSaveAgain: "\u9700\u8981\u8d2d\u4e70\u8fd9\u4e2a\u89d2\u8272\u50a8\u5b58\u683c\u7684\u7f16\u8f91\u5668\uff0c\u624d\u80fd\u518d\u6b21\u7f16\u8f91\u60a8\u7684\u81ea\u521b\u89d2\u8272\u3002 ",
                            roleModifed: "\u60a8\u4e0a\u4f20\u7684\u89d2\u8272\u9020\u578b\u5df2\u88ab\u4fee\u6539\u4ee5\u7b26\u5408\u76ee\u524d\u7684\u9635\u8425\u8bbe\u5b9a\u3002 ",
                            labelBuyPrice: "\u9996\u8d2d\u4ef7",
                            labelBuyAgainPrice: "\u518d\u6b21\u8d2d\u4e70\u7279\u4ef7",
                            allowMultiSelect: "\u6309\u4f4f Ctrl \u53ef\u52a0\u9009"
                        },
                        gender: {
                            male: "\u7537\u6027",
                            female: "\u5973\u6027"
                        },
                        weaponEditor: {
                            control: {
                                switchWeapon: "\u6362\u6b66\u5668(Q)",
                                animation: "\u653b\u51fb\u52a8\u753b(F)",
                                comboAnim: "\u8fde\u51fb\u52a8\u753b(C)",
                                reloadAnim: "\u88c5\u586b\u52a8\u753b (R)",
                                shootsAnim: "\u8fde\u7eed\u5c04\u51fb (C)"
                            },
                            prop: {
                                animType: "\u52a8\u753b\u53c2\u8003",
                                alias: "\u6b66\u5668\u56fe\u6837\u8d44\u6e90",
                                gunAlias: "\u624b\u6301\u56fe\u6837\u8d44\u6e90",
                                baseDamage: "\u57fa\u7840\u653b\u51fb\u529b",
                                weight: "\u91cd\u91cf",
                                swapTime: "\u6362\u6b66\u5668\u65f6\u95f4",
                                widerPickTest: "\u589e\u52a0\u53ef\u62fe\u53d6\u7684\u8303\u56f4",
                                gunLength: "\u67aa\u53e3\u8ddd\u79bb",
                                reloadTime: "\u88c5\u586b\u5f39\u836f\u65f6\u95f4",
                                minAimRange: "\u6700\u5c0f\u51c6\u5fc3",
                                maxAimRange: "\u6700\u5927\u51c6\u5fc3",
                                shakeImpact: "\u5c04\u51fb\u51c6\u5fc3\u53d8\u5316",
                                moveShakeRate: "\u79fb\u52a8\u51c6\u5fc3\u53d8\u5316",
                                aimFocusRate: "\u51c6\u5fc3\u56de\u590d\u7387",
                                aimDistanceRangeRate: "\u8fdc\u5904\u51c6\u5fc3\u500d\u7387",
                                fireDelay: "\u5c04\u51fb\u95f4\u8ddd",
                                maxBullets: "\u5f39\u5323\u7a7a\u95f4",
                                pushPower: "\u51fb\u9000\u529b",
                                autoTimes: "\u8fde\u5c04\u6b21\u6570",
                                rotateRate: "\u8f6c\u8eab\u901f\u7387",
                                hand: "\u62ff\u5728\u624b\u4e0a\u7684\u504f\u79fb\u8c03\u6574",
                                handX: "\u951a\u70b9X",
                                handY: "\u951a\u70b9Y",
                                handR: "\u89d2\u5ea6",
                                handSx: "\u7f29\u653eX",
                                handSy: "\u7f29\u653eY",
                                reload: "\u88c5\u586b\u5f39\u836f\u7684\u504f\u79fb\u8c03\u6574",
                                reloadX: "\u951a\u70b9X",
                                reloadY: "\u951a\u70b9Y",
                                reloadR: "\u89d2\u5ea6",
                                reloadSx: "\u7f29\u653eX",
                                reloadSy: "\u7f29\u653eY",
                                icon: "\u5f53\u4f5c\u56fe\u793a\u7684\u504f\u79fb\u8c03\u6574",
                                iconX: "\u951a\u70b9X",
                                iconY: "\u951a\u70b9Y",
                                iconR: "\u89d2\u5ea6",
                                iconSx: "\u7f29\u653eX",
                                iconSy: "\u7f29\u653eY",
                                iconAuto: "\u81ea\u52a8\u8bbe\u5b9a",
                                iconShiftX: "\u8ba1\u6570\u5668\u56fe\u793a\u5e73\u79fbX",
                                iconShiftY: "\u8ba1\u6570\u5668\u56fe\u793a\u5e73\u79fbY",
                                itemScaleOnIcon: "\u8ba1\u6570\u5668\u56fe\u793a\u7684\u7f29\u653e\u503c",
                                scaleOnGround: "\u653e\u5730\u4e0a\u65f6\u7684\u7f29\u653e\u503c",
                                scaleOnIcon: "\u53f3\u4e0a\u56fe\u793a\u7684\u7f29\u653e\u503c",
                                fireInfos: "\u653b\u51fb\u6a21\u5f0f\u8bbe\u5b9a",
                                deltaDamage: "\u653b\u51fb\u529b\u53d8\u5316",
                                fireType: "\u653b\u51fb\u52a8\u753b",
                                fireFirst: "\u7b2c\u4e00\u51fb",
                                fireCombo: "\u7b2c{{index}}\u8fde\u51fb",
                                equippable: "\u53ef\u88c5\u5907\u5728\u8eab\u4e0a",
                                float: "\u98d8\u6d6e\u52a8\u753b",
                                floatSpeed: "\u98d8\u6d6e\u52a8\u753b\u9891\u7387",
                                floatScale: "\u98d8\u6d6e\u52a8\u753b\u5927\u5c0f",
                                radius: "\u516c\u8f6c\u534a\u5f84",
                                orbitSpeed: "\u516c\u8f6c\u901f\u5ea6",
                                rotateSpeed: "\u81ea\u8f6c\u901f\u5ea6",
                                preventDefault: "\u53d6\u6d88\u9884\u8bbe\u7684\u7206\u70b8\u884c\u4e3a",
                                explodeOnBounce: "\u63a5\u89e6\u5730\u9762\u5373\u7206\u70b8",
                                shadowRadius: "\u5f71\u5b50\u534a\u5f84",
                                rotationOnWall: "\u5361\u5728\u5899\u4e0a\u7684\u89d2\u5ea6",
                                throwRotation: "\u98de\u884c\u4e2d\u7684\u89d2\u5ea6\u8c03\u6574",
                                throwScale: "\u98de\u884c\u4e2d\u7684\u7f29\u653e\u8c03\u6574",
                                throwDeltaScale: "\u98de\u884c\u4e2d\u7684\u7f29\u653e\u53d8\u5316",
                                setLimitPerGame: "\u81ea\u8ba2\u6bcf\u573a\u6218\u6597\u6700\u591a\u4f7f\u7528\u6b21\u6570",
                                limitPerGame: "\u4f7f\u7528\u6b21\u6570\u9650\u5236",
                                noSpin: "\u5728\u7a7a\u4e2d\u4e0d\u65cb\u8f6c",
                                noArrow: "\u4e0d\u663e\u793a\u5b9a\u4f4d\u7bad\u5934"
                            },
                            btnAddCombo: "\u589e\u52a0\u8fde\u51fb",
                            aliasDefault: "\u9884\u8bbe\u56fe\u6837",
                            ms: "\u6beb\u79d2",
                            perGame: "/\u573a",
                            btnAddWeapon: "\u65b0\u589e\u81ea\u521b\u6b66\u5668",
                            customWeaponTip: "\u5728\u4e8b\u4ef6\u8868\u9876\u7aef\u7684\u300c\u5149\u6655\u6218\u8bb0\u6e38\u620f\u8bbe\u5b9a\u300d\u4e2d\u6709\u4e00\u533a\u53ef\u4ee5\u8bbe\u8ba1\u81ea\u5236\u6b66\u5668\u3002\u8bbe\u8ba1\u597d\u7684\u6b66\u5668\u5c31\u4f1a\u51fa\u73b0\u5728\u8fd9\u513f\u6210\u4e3a\u9009\u9879\u3002 ",
                            btnAddItem: "\u65b0\u589e\u81ea\u521b\u9053\u5177",
                            customItemTip: "\u5728\u4e8b\u4ef6\u8868\u9876\u7aef\u7684\u300c\u5149\u6655\u6218\u8bb0\u6e38\u620f\u8bbe\u5b9a\u300d\u4e2d\u6709\u4e00\u533a\u53ef\u4ee5\u8bbe\u8ba1\u81ea\u5236\u9053\u5177\u3002\u8bbe\u8ba1\u597d\u7684\u9053\u5177\u5c31\u4f1a\u51fa\u73b0\u5728\u8fd9\u513f\u6210\u4e3a\u9009\u9879\u3002 ",
                            applyWeaponDefaults: "\u4f7f\u7528\u53c2\u8003\u6b66\u5668\u7684\u6240\u6709\u6570\u503c\uff08\u5c06\u4f1a\u8986\u76d6\u76ee\u524d\u7684\u6570\u503c\uff09\uff1f "
                        },
                        itemEditor: {
                            updateType: {
                                still: "\u4e0d\u65cb\u8f6c",
                                followHead: "\u8ddf\u7740\u9762\u5411\u65cb\u8f6c",
                                followCape: "\u8ddf\u7740\u62ab\u98ce\u65cb\u8f6c",
                                followVelocity: "\u8ddf\u7740\u524d\u8fdb\u65b9\u5411\u65cb\u8f6c",
                                followFeet: "\u8ddf\u7740\u811a\u6b65\u65cb\u8f6c",
                                orbit: "\u7ed5\u7740\u89d2\u8272\u65cb\u8f6c"
                            }
                        },
                        "tw.label.civilFull": "\u65e0\u5173\u9635\u8425"
                    })
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
            return t("showRoleEditorScreen", (function(t) {
                _ && !G || (G && G.handleClose(),
                H || ($(s.renderer.view).css("z-index", "unset"),
                $(s.renderer.view).css("position", "relative"),
                $(s.renderer.view).css("pointer-events", "all"),
                s.stageAlignHorizontal = o.ALIGN_HORIZONTAL.CENTER,
                s.stageAlignVertial = o.ALIGN_VERTICAL.MIDDLE,
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
                            this.rightResizeActive = !1,
                            this.rightResizeParentRect = null,
                            this.onRangeInputChange = () => {
                                this.pushHistory()
                            }
                            ,
                            this.releaseSliderFocus = e => {
                                const t = e && (e.currentTarget || e.target);
                                t && "function" == typeof t.blur && window.setTimeout(( () => t.blur()), 0)
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
                            // --- 修改後的鏡像複製函數 (支援左右與上下) ---
                            this.mirrorCopySelectedDeco = (mode) => {
                                var selected = this.state.selectedDecos;
                                if (!selected || selected.length === 0) return;

                                var newDecos = [];
                                var insertIndex = this.getCreateInsertIndex("copy", (() => this.decoManager && this.decoManager.items ? this.decoManager.items.length : 0));
                                selected.forEach(deco => {
                                    if (deco.isHead()) return;
                                    var newDeco = this.decoManager.addDeco(deco.code, insertIndex);
                                    var originalClip = deco.clip;
                                    var newX = originalClip.x;
                                    var newY = originalClip.y;
                                    var newScaleX = originalClip.scale.x;
                                    var newScaleY = originalClip.scale.y;
                                    var newRotation = -originalClip.rotation;

                                    if (mode === 'vertical') {
                                        newY = -originalClip.y;
                                        newScaleY = -originalClip.scale.y;
                                    } else {
                                        newX = -originalClip.x;
                                        newScaleX = -originalClip.scale.x;
                                    }

                                    if (newDeco) {
                                        newDeco.clip && (newDeco.clip.position.set(newX, newY),
                                        newDeco.clip.scale.set(newScaleX, newScaleY),
                                        newDeco.clip.rotation = newRotation,
                                        newDecos.push(newDeco)),
                                        insertIndex++;
                                    }
                                });

                                if (newDecos.length > 0) {
                                    this.decoManager.selectDecos(newDecos);
                                    this.refreshEditValues();
                                    this.pushHistory();
                                }
                            }
                            this.copySelectedDecos = () => {
                                if (!this.state.selectedDecos.length)
                                    return;
                                let e = this.state.selectedDecos.filter((e => !e.isHead()));
                                e.length && (this.copiedDecos = e.map((e => ({
                                    code: e.code,
                                    x: e.clip ? e.clip.x : 0,
                                    y: e.clip ? e.clip.y : 0,
                                    scaleX: e.clip ? e.clip.scale.x : 1,
                                    scaleY: e.clip ? e.clip.scale.y : 1,
                                    rotation: e.clip ? e.clip.rotation : 0
                                }))),
                                e.length && (this.pasteOffset = 0))
                            }
                            ,
                            this.pasteCopiedDecos = () => {
                                if (!this.decoManager || !this.copiedDecos || !this.copiedDecos.length)
                                    return;
                                var newItems = [];
                                this.pasteOffset = (this.pasteOffset || 0) + 5;
                                var offset = this.pasteOffset;
                                var insertIndex = this.getCreateInsertIndex("copy", (() => this.getPasteInsertIndex()));
                                this.copiedDecos.forEach((data => {
                                    if (!data || !data.code)
                                        return;
                                    var newItem = this.decoManager.addDeco(data.code, insertIndex);
                                    if (newItem) {
                                        newItem.clip && (newItem.clip.position.set(data.x + offset, data.y + offset),
                                        newItem.clip.scale.set(data.scaleX, data.scaleY),
                                        newItem.clip.rotation = data.rotation,
                                        newItems.push(newItem)),
                                        insertIndex++;
                                    }
                                }
                                )),
                                newItems.length && (this.decoManager.selectDecos(newItems),
                                this.refreshEditValues(),
                                this.pushHistory())
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
                                }, (() => this.pushHistory()))
                            }
                            ,
                            this.toggleGroupVisibility = e => {
                                if (!e)
                                    return;
                                const t = e.visible === !1
                                  , i = (this.state.decoGroups || []).map((a => a === e ? Object.assign({}, a, {
                                    visible: t
                                }) : a));
                                i.forEach((e => (e.items || []).forEach((i => {
                                    i && this.decoGroupMap.set(i, e),
                                    i && i.clip && (i.clip.visible = e.visible !== !1)
                                }
                                )))),
                                this.setState({
                                    decoGroups: i
                                }, (() => this.pushHistory()))
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
                                }, () => this.pushHistory());
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
                                this.decoManager.removeDeco(e)
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
                                    this.pushHistory()
                                }
                            }
                            ,
                            this.rotateSelectedDeco = e => {
                                if (this.state.selectedDecos.length) {
                                    let t = g.normalizeDegrees(Number(e.target.value));
                                    this.decoManager.decoController.setRotationDeg(t),
                                    this.refreshEditValues()
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
                                    this.refreshEditValues()
                                }
                            }
                            ,
                            this.ratioSelectedDeco = e => {
                                if (this.state.selectedDecos.length) {
                                    let t = Number(e.target.value)
                                      , i = this.decoManager.decoController.container;
                                    this.decoManager.decoController.setScale(i.scaleX, Math.abs(i.scaleX) * t),
                                    this.refreshEditValues()
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
                                this.pushHistory()
                            }
                            ,
                            this.onGenderSelected = e => {
                                let t = F.getByCode(e.target.value)
                                  , i = this.exportConfig();
                                this.setCampAndGender(this.state.selectedCamp, t, i),
                                t.female ? E.GIRL_DEAD.play() : E.MAN_DEAD.play(),
                                this.pushHistory()
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
                                            }, (() => this.pushHistory()));
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
                                this.mergeFileInputRef.current.click()
                            },
                            
                            this.onMergeFileSelected = (event) => {
                                var file = event.target.files[0];
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
                                                var insertIndex = this.getCreateInsertIndex("mergeBatch", (() => this.decoManager && this.decoManager.items ? this.decoManager.items.length : 0));
                                                config.decolist.forEach((decoData, idx) => {
                                                    if (decoData.code !== y.HEAD_CODE) {
                                                        var newDeco = this.decoManager.addDeco(decoData.code, insertIndex, true);
                                                        newDeco && (newDeco.clip && (newDeco.clip.position.copyFrom(decoData.position),
                                                        newDeco.clip.scale.copyFrom(decoData.scale),
                                                        newDeco.clip.rotation = decoData.rotation),
                                                        insertIndex++);
                                                        newDecos.push(newDeco);
                                                        originalIndexToDeco[idx] = newDeco;
                                                    } else {
                                                        originalIndexToDeco[idx] = null;
                                                    }
                                                });

                                                if (json.decoGroups && json.decoGroups.length) {
                                                    var mergedGroups = (this.state.decoGroups || []).slice();
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
                                                    this.setState({
                                                        decoGroups: mergedGroups
                                                    });
                                                }

                                                if (newDecos.length > 0) {
                                                    this.decoManager.selectDecos(newDecos);
                                                    this.setState({
                                                        decos: this.decoManager.items
                                                    });
                                                    this.refreshEditValues();
                                                    this.pushHistory();
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
                                this.fileInputRef.current.click()
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
                                  , i = t.indexOf(e);
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
                                const updatedGroups = (null != newDecoGroups ? [...newDecoGroups] : [...(this.state.decoGroups || [])]).map((group => {
                                    const groupItems = newDecos.filter((item => this.decoGroupMap.get(item) === group));
                                    return group.items = groupItems,
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
                                setTimeout((() => {
                                    this.setState({
                                        decos: newDecos,
                                        decoGroups: updatedGroups,
                                        layoutVersion: (this.state.layoutVersion || 0) + 1,
                                        scrollTop: savedScrollTop
                                    }, (() => {
                                        requestAnimationFrame((() => {
                                            this.editListRef.current && (this.editListRef.current.scrollTop = savedScrollTop),
                                            setTimeout((() => {
                                                this.isSettling = !1
                                            }
                                            ), 100)
                                        }
                                        ))
                                    }
                                    )),
                                    pushHistory && this.pushHistory()
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
                                // Virtual List aware onSortEnd
                                const isGroupDrag = evt.item.classList.contains('groupRow');
                                // Ensure both root sortable and nested group sortables skip onDecolistUpdate during DOM settling.
                                this.isSettling = true;
                                let resolveRestoreContainer = null;
                                
                                let newDecos = [...this.state.decos];
                                let newDecoGroups = [...(this.state.decoGroups || [])];

                                if (isGroupDrag) {
                                    // --- Group Reordering ---
                                    const groupId = evt.item.getAttribute("data-id");
                                    const draggedGroup = newDecoGroups.find(g => g.id === groupId);
                                    
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
                                                const idx = newDecoGroups.findIndex(g => g.id === nextGroupId);
                                                if (idx > -1) insertIndexGroups = idx;
                                                
                                                // Decos List Insertion (Z-Order / High Index = Top)
                                                // We want to be visually ABOVE the next group.
                                                // So our indices must be HIGHER than the next group's items.
                                                const nextGroup = (this.state.decoGroups || []).find(g => g.id === nextGroupId);
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
                                    }
                                } else {
                                    // --- Item Reordering (Standard) ---
                                    const draggedItemIndex = parseInt(evt.item.getAttribute("data-index"));
                                    if (isNaN(draggedItemIndex)) return;
                                    
                                    const draggedItem = this.state.decos[draggedItemIndex];
                                    if (!draggedItem) return;

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
                                    const getGroupById = (groupId) => newDecoGroups.find(g => g.id === groupId) || null;
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
                                const r = (this.state.draggingDecos && this.state.draggingDecos.length ? this.state.draggingDecos : this.currentDraggingDecos) || [];
                                r.includes(e) && i.push("dragging"),
                                this.insertItem == e && i.push("inserting");
                                const a = this.state.selectedDecos.includes(e)
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
                                this.setState({
                                    decoGroups: t
                                }, (() => this.pushHistory()))
                            }
                            ,
                            this.createDecoGroup = (selectedItems) => {
                                if (!selectedItems || !selectedItems.length) return;
                                const groupIdx = (this.state.decoGroups || []).length + 1;
                                const allDecos = this.state.decos || [];
                                const items = sortRoleEditorDecosByLayer(selectedItems, allDecos);
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
                                this.setState({ decoGroups: newGroups }, () => this.pushHistory());
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
                                    }, () => this.pushHistory());
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
                                this.setState({ decoGroups: newGroups }, () => this.pushHistory());
                            }
                            ,
                            this.initGroupSortable = (el, group) => {
                                if (el) {
                                    if (this.groupSortables.has(group)) return;
                                    const s = new Sortable(el, {
                                        group: 'decos',
                                        draggable: ".dragBlock", // Items inside group
                                        animation: 150,
                                        onEnd: (evt) => this.onSortEnd(evt),
                                        onMove: (evt) => {
                                            // Prevent groups from being dragged into other groups
                                            if (evt.dragged && evt.dragged.classList.contains('groupRow')) {
                                                return false;
                                            }
                                            return true; // Allow items
                                        }
                                    });
                                    this.groupSortables.set(group, s);
                                } else if (group) {
                                    const s = this.groupSortables.get(group);
                                    if (s) {
                                        s.destroy();
                                        this.groupSortables.delete(group);
                                    }
                                }
                            }
                            ,
                            this.renderGroupRow = (group, currentY = 0, renderStart = 0, renderEnd = 100000) => {
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
                                    const globalIndex = allDecos.indexOf(item);
                                    
                                    if (!group.collapsed) {
                                        if (itemCurrentY + ITEM_HEIGHT < renderStart) {
                                            paddingTop += ITEM_HEIGHT;
                                        } else if (itemCurrentY > renderEnd) {
                                            paddingBottom += ITEM_HEIGHT;
                                        } else {
                                            if (globalIndex !== -1) {
                                                renderedItems.push(this.renderDragBlock(item, globalIndex, true));
                                            }
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
                                            checked: group.visible,
                                            style: { padding: 0 },
                                            onClick: (e) => e.stopPropagation(),
                                            onChange: (e) => {
                                                group.visible = e.target.checked;
                                                group.items.forEach(item => { if(item.clip) item.clip.visible = group.visible; });
                                                this.forceUpdate();
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
                                const renderedGroups = new Set();
                                const nodes = [];
                                
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
                                const renderStart = useTopSpacer 
                                    ? Math.max(0, scrollTop - buffer) 
                                    : Math.max(0, scrollTop - maxRenderRange);
                                const renderEnd = scrollTop + viewportHeight;

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
                                            const containsForcedItem = (forcedDragIndex !== -1 && group.items.includes(allDecos[forcedDragIndex]));
                                            
                                            // Determine visibility - Note currentY increases (Top down)
                                            // Visible intersection: (CurrentY < RenderEnd) AND (CurrentY + Height > RenderStart)
                                            const isVisible = (currentY < renderEnd && (currentY + groupHeight) > renderStart) || isForcedGroup || containsForcedItem;

                                            if (isVisible) {
                                                pushPendingSpacer();
                                                
                                                let gStart = renderStart;
                                                let gEnd = renderEnd;
                                                
                                                if (containsForcedItem) {
                                                    gStart = -1;
                                                    gEnd = Number.MAX_SAFE_INTEGER;
                                                }
                                                
                                                nodes.push(this.renderGroupRow(group, currentY, gStart, gEnd));
                                            } else {
                                                pendingSpacerHeight += groupHeight;
                                            }
                                            currentY += groupHeight;
                                        }
                                    } else {
                                        // Standalone Item
                                        const isForcedItem = (i === forcedDragIndex);
                                        const isVisible = (currentY < renderEnd && (currentY + ITEM_HEIGHT) > renderStart) || isForcedItem;

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
                                        const isVisible = (currentY < renderEnd && (currentY + groupHeight) > renderStart) || isForcedGroup;
                                        
                                        if (isVisible) {
                                            pushPendingSpacer();
                                            nodes.push(this.renderGroupRow(group, currentY, renderStart, renderEnd));
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
                            this.btnLogPayload = () => {
                                const t = this.exportRoleDesignData()
                                  , i = e && e.GLT && e.GLT.utils && e.GLT.utils.GzipUtil ? e.GLT.utils.GzipUtil.zipJson(t.exportSyncJson()) : null;
                                console.log("[RoleEditor] exportRoleDesignData payload:", t),
                                i ? console.log("[RoleEditor] gzip+base64 payload:", i) : console.warn("[RoleEditor] GzipUtil not available, cannot encode payload.");
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
                        pushHistory() {
                            const currentGroups = createRoleEditorGroupSnapshot(this.state.decoGroups || [], this.decoManager.items || [], "items");
                            for (this.historyIndex >= 0 && this.historyIndex < this.history.length - 1 && (this.history.length = this.historyIndex + 1),
                            this.history.push({
                                select: this.decoManager.getSelectedDecoIndexes(),
                                role: JSON.stringify(this.exportRoleDesignData().exportSyncJson()),
                                groups: currentGroups
                            }); this.history.length > 200; )
                                this.history.shift();
                            this.historyIndex = this.history.length - 1
                        }
                        loadHistory(e) {
                            this.historyIndex = e;
                            let t = this.history[e]
                              , i = JSON.parse(t.role)
                              , a = d.createFromJson(i);
                            this.importRoleDesignData(a);

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
                            this.resizeObserver = new ResizeObserver((entries => {
                                // Debounce to avoid excessive recalculations during resize
                                if (this.resizeTimer) clearTimeout(this.resizeTimer);
                                this.resizeTimer = setTimeout(() => {
                                    this.initPartInfiScroll();
                                    // Recalculate actor stage position when left panel size changes
                                    this.updateActorPosition();
                                }, 50);
                            }
                            )),
                            this.choiceListRef.current && this.resizeObserver.observe(this.choiceListRef.current),
                            this.editListRef.current && this.resizeObserver.observe(this.editListRef.current),
                            this.props.emitter.on("requestJson", this.onRequestJson, this),
                            s.on(o.EVENT.STAGE_RESIZED, this.onResized, this),
                            s.root.addChild(this.actorStage),
                            this.actorStage.addChild(this.actorClip),
                            this.actorClip.footContainer.loop = !1,
                            this.updateActorPosition(),
                            $(this.stageRef.current).append(s.renderer.view),
                            this.rotateInputRef.current.onchange = this.onRangeInputChange,
                            this.scaleInputRef.current.onchange = this.onRangeInputChange,
                            this.ratioInputRef.current.onchange = this.onRangeInputChange,
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
                                animation: 150,
                                toggleScroll: true,
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
                                    // FORCE UPDATE: Immediately expand the virtual list to include top items.
                                    this.forceUpdate();
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
                            this.pushHistory(),
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
                            this.resizeTimer && (clearTimeout(this.resizeTimer), this.resizeTimer = null),
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
                                    this.pushHistory()
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
                                        toDelete.forEach(deco => {
                                            if (!deco.isHead()) {
                                                this.decoManager.removeDeco(deco);
                                            }
                                        });
                                        this.decoManager.selectDecos([]);
                                        this.refreshEditValues();
                                        this.pushHistory();
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
                            let e = this.state.editValues;
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
                            this.pushHistory())
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
                            let e = $(this.stageBgRef.current).offset()
                              , t = new PIXI.Point(e.left,e.top);
                            t = s.root.toLocal(t),
                            t.x += 68,
                            t.y += 98,
                            this.actorStage.position.set(t.x, t.y)
                        }
                        onBtnTab(e) {
                            if (this.partInfiScroll) {
                                this.partInfiScroll.dispose();
                                this.partInfiScroll = null;
                                // 確保在 React 接管回 DOM 前，容器是空的
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
                                        a.scrollTo({
                                            left: 0,
                                            top: -a.scrollHeight + a.clientHeight
                                        })
                                    }
                                    ))
                                }
                            }
                            this.pushHistory(),
                            this.setState({
                                roleComponentCode: a
                            })
                        }
                        onBtnSelected(e, t) {
                            let i = this.state.selectedDecos;
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
                                this.moveDraggingDecos(t, e) && this.pushHistory()
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
                                editValues: this.state.editValues
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
                           // let i = this.state.ingame;
                           // i && T.fixIngameRoleDesign(t, i.role.defaultRole.defaultCamp) && e.GLT.components.showAlert(" ", c("roleEditor.roleModifed"), c("tw.button.gotit")),
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
                        // 在 RoleEditor (N 類別) 中
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

                            // 如果已初始化且參數沒變，則跳過
                            if (this.partInfiScroll) {
                                if (this.partInfiScroll.__tabCode === tab.code && 
                                    this.partInfiScroll.__itemsPerRow === itemsPerRow &&
                                    this.partInfiScroll.__size === totalRows &&
                                    this.partInfiScroll.__selectedCode === selectedCode) {
                                    return;
                                }
                                this.partInfiScroll.dispose();
                            }

                            this.partInfiScroll = new InfiScroll(container, {
                                generator: (rowIdx, callback) => {
                                    // 使用原本的 "material" class，以繼承原始 CSS 定義的佈局
                                    const rowEl = document.createElement("div");
                                    rowEl.className = "material";
                                    rowEl.style.width = "100%";
                                    rowEl.style.boxSizing = "border-box";
                                    rowEl.style.overflow = "hidden";

                                    for (let i = 0; i < itemsPerRow; i++) {
                                        const itemIdx = rowIdx * itemsPerRow + i;
                                        if (itemIdx >= options.length) break;

                                        const item = options[itemIdx];
                                        const itemEl = document.createElement("div");
                                        itemEl.className = "choiceBlock button " + (selectedCode == item.code ? "selected" : "");
                                        
                                        itemEl.onclick = (e) => {
                                            e.stopPropagation();
                                            this.onBtnPart(tab, item);
                                            if (this.choiceListRef.current) {
                                                const allItems = this.choiceListRef.current.querySelectorAll(".choiceBlock");
                                                allItems.forEach(el => el.classList.remove("selected"));
                                                itemEl.classList.add("selected");
                                            }
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
                                childSize: ITEM_SIZE, // 固定高度為物件大小
                                fixedSize: true
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
                                class: "does-btns"
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
                                disabled: a,
                                value: t.editValues.rotate,
                                onChange: this.rotateSelectedDeco,
                                onMouseUp: this.releaseSliderFocus,
                                onTouchEnd: this.releaseSliderFocus
                            }), React.createElement("div", {
                                class: "btn-input-box",
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
                                min: o ? o.scaleRange.min : .001,
                                max: o ? o.scaleRange.max : 1,
                                disabled: a,
                                value: Math.abs(t.editValues.scaleX),
                                onChange: this.scaleSelectedDeco,
                                onMouseUp: this.releaseSliderFocus,
                                onTouchEnd: this.releaseSliderFocus
                            }), React.createElement("div", {
                                class: "btn-input-box",
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
                                min: x.DecoConstant.SCALE_RATIO_MIN,
                                max: x.DecoConstant.SCALE_RATIO_MAX,
                                disabled: a,
                                value: Math.abs(t.editValues.scaleY / t.editValues.scaleX),
                                onChange: this.ratioSelectedDeco,
                                onMouseUp: this.releaseSliderFocus,
                                onTouchEnd: this.releaseSliderFocus
                            }), React.createElement("div", {
                                class: "btn-input-box",
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
                                                console.warn("Ignored scroll jump to 0");
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
                                                this.forceUpdate(); // Trigger re-render to apply virtualization
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
                                    class: "input-box"
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
                                this.refreshEditValues()
                            }
                        }
                        onInputBoxBlur(e) {
                            let t = {};
                            t[e.key + "InputBox"] = null,
                            this.setState(t)
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
        System.register("TWRoleCgEditor/helpers/RoleSetBox", [], (function(t, i) {
            "use strict";
            var a, o, s, n, r;
            i && i.id,
            i && i.id;
            return t("getRoleSetBoxStyles", (function() {
                return {
                    roleset: {
                        width: n.width,
                        height: n.height,
                        border: "2px solid #ccc3",
                        borderRadius: 3,
                        margin: 6,
                        cursor: "pointer",
                        background: "#567",
                        "&:hover": {
                            borderColor: "#ffdc",
                            background: "rgba(255,255,255, 0.5)"
                        },
                        "&.selected": {
                            borderColor: "#fff",
                            background: "rgba(255,255,255, 0.75)"
                        }
                    }
                }
            }
            )),
            {
                setters: [],
                execute: function() {
                    a = e.TwilightWarsLib.games.displays.ActorClip,
                    o = e.Base.geom.Size,
                    s = e.TwilightWarsLib.games.dummyGame,
                    n = new o(48,48),
                    r = class extends React.Component {
                        constructor(e, t) {
                            super(e, t),
                            this.state = {}
                        }
                        componentDidMount() {
                            this.actorClip = new a(s),
                            this.actorClip.scale.set(.8),
                            this.props.role ? this.actorClip.setRole(this.props.role) : this.actorClip.setRoleSet(this.props.roleSet),
                            this.actorClip.setBodyFrame("IDLE_KONGFU_TYPE", !1),
                            this.actorClip.position.set(n.width / 2, n.height / 2),
                            this.container = new PIXI.Container,
                            e.Base.pixi.root.addChild(this.container),
                            this.container.addChild(this.actorClip),
                            e.Base.addUpdateFunction(this, this.update)
                        }
                        componentWillUnmount() {
                            e.Base.removeUpdateFunction(this, this.update),
                            this.actorClip && (this.actorClip.dispose(),
                            this.actorClip = null),
                            this.container && (this.container.parent && this.container.parent.removeChild(this.container),
                            this.container.destroy && this.container.destroy({
                                children: !0
                            }),
                            this.container = null)
                        }
                        update() {
                            if (!this.refs.root || !this.container)
                                return;
                            var e = this.refs.root.getBoundingClientRect();
                            e.width && e.height ? (this.container.position.set(e.left, e.top),
                            this.container.visible = !0) : this.container.visible = !1
                        }
                        render() {
                            let e = [this.props.classes.roleset];
                            return this.props.selected && e.push("selected"),
                            React.createElement("div", {
                                className: e.join(" "),
                                ref: "root",
                                onClick: () => this.props.onSelect(this.props.roleSet, this.props.role)
                            })
                        }
                    }
                    ,
                    t("RoleSetBox", r)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/weapons/WeaponBox", ["./WeaponChooser"], (function(t, i) {
            "use strict";
            var a, o, s, n;
            i && i.id,
            i && i.id;
            return t("getWeaponBoxStyles", (function() {
                return {
                    weaponBox: {
                        width: s.width,
                        height: s.height,
                        border: "1px solid #bbb",
                        borderRadius: 3,
                        margin: 6,
                        cursor: "pointer",
                        background: "#647484",
                        "&.preSelected": {
                            background: "#9ab",
                            borderColor: "#eee"
                        },
                        "&.selected": {
                            background: "#789",
                            borderColor: "#ffd"
                        },
                        "&:hover": {
                            borderColor: "#ffd",
                            background: "rgba(255,255,255, 0.5)"
                        }
                    }
                }
            }
            )),
            {
                setters: [function(e) {
                    o = e
                }
                ],
                execute: function() {
                    a = e.Base.geom.Size,
                    s = new a(64,64),
                    n = class extends React.Component {
                        constructor(e) {
                            super(e),
                            this.state = {}
                        }
                        componentDidMount() {
                            let t = this.props.weapon.scaleOnIcon;
                            this.props.scale && (t *= this.props.scale),
                            this.sprite = o.createStuffIcon(this.props.weapon),
                            this.sprite.scale.set(t),
                            this.sprite.position.set(s.width / 2, s.height / 2),
                            this.container = new PIXI.Container,
                            this.container.addChild(this.sprite),
                            e.Base.pixi.root.addChild(this.container),
                            e.Base.addUpdateFunction(this, this.update)
                        }
                        componentWillUnmount() {
                            e.Base.removeUpdateFunction(this, this.update),
                            this.container && (this.container.destroy(),
                            this.container = null)
                        }
                        update() {
                            if (!this.refs.root || !this.container)
                                return;
                            var e = this.refs.root.getBoundingClientRect();
                            e.width && e.height ? (this.container.position.set(e.left, e.top),
                            this.container.visible = !0) : this.container.visible = !1
                        }
                        render() {
                            let e = [this.props.classes.weaponBox];
                            this.props.preSelected && e.push("preSelected"),
                            this.props.selected && e.push("selected");
                            const t = this.props.weapon;
                            return React.createElement("div", {
                                className: e.join(" "),
                                ref: "root",
                                onClick: () => this.props.onSelect(t),
                                title: t.code
                            })
                        }
                    }
                    ,
                    t("WeaponBox", n)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/weapons/StoreItemBox", ["./WeaponApp"], (function(t, i) {
            "use strict";
            var a, o, s, n;
            i && i.id,
            i && i.id;
            return t("getStoreItemBoxStyles", (function() {
                return {
                    storeItemBox: {
                        width: n.width,
                        height: n.height,
                        border: "1px solid #bbb",
                        borderRadius: 3,
                        margin: 6,
                        padding: 1,
                        cursor: "pointer",
                        background: "#647484",
                        "&.preSelected": {
                            background: "#9ab",
                            borderColor: "#eee"
                        },
                        "&.selected": {
                            background: "#789",
                            borderColor: "#ffd"
                        },
                        "&:hover": {
                            borderColor: "#ffd",
                            background: "rgba(255,255,255, 0.5)"
                        },
                        "& img": {
                            width: "100%",
                            height: "100%",
                            borderRadius: 3
                        }
                    }
                }
            }
            )),
            {
                setters: [function(e) {
                    o = e
                }
                ],
                execute: function() {
                    a = e.Base.geom.Size,
                    s = class extends React.Component {
                        constructor(e) {
                            super(e),
                            this.state = {}
                        }
                        render() {
                            let e = [this.props.classes.storeItemBox];
                            this.props.preSelected && e.push("preSelected"),
                            this.props.selected && e.push("selected");
                            let t = o.getStoreItem(this.props.item.gameItemCode)
                              , i = t ? t.name + ": " + (t.description || t.desc || "") : this.props.item.gameItemCode;
                            return React.createElement(MaterialUI.Tooltip, {
                                title: i
                            }, React.createElement("div", {
                                className: e.join(" "),
                                onClick: () => this.props.onSelect(this.props.item)
                            }, t && React.createElement("img", {
                                src: t.iconUrl
                            })))
                        }
                    }
                    ,
                    t("StoreItemBox", s),
                    n = new a(64,64)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/itemicons/ItemIconBox", [], (function(t, i) {
            "use strict";
            var a, o, s, n;
            i && i.id,
            i && i.id;
            return t("getItemIconBoxStyles", (function() {
                return {
                    iconBox: {
                        width: s.width,
                        height: s.height,
                        border: "1px solid #bbb",
                        borderRadius: 3,
                        margin: 6,
                        cursor: "pointer",
                        background: "#647484",
                        "&.preSelected": {
                            background: "#9ab",
                            borderColor: "#eee"
                        },
                        "&.selected": {
                            background: "#789",
                            borderColor: "#ffd"
                        },
                        "&:hover": {
                            borderColor: "#ffd",
                            background: "rgba(255,255,255, 0.5)"
                        }
                    }
                }
            }
            )),
            {
                setters: [],
                execute: function() {
                    a = e.Base.geom.Size,
                    o = e.TwilightWarsLib.games.items.StuffInfo,
                    s = new a(48,48),
                    n = class extends React.Component {
                        constructor(e, t) {
                            super(e, t),
                            this.state = {}
                        }
                        componentDidMount() {
                            const t = this.props.itemIcon;
                            if (this.sprite = t.createIcon(),
                            !this.sprite) {
                                let e = o.getByCode(t.code);
                                if (e) {
                                    let t = e.spriteInfo.createClipOnIcon();
                                    t.scale.set(e.scaleOnIcon || .3),
                                    this.sprite = t
                                }
                            }
                            this.container = new PIXI.Container,
                            this.sprite && (this.sprite.position.set(s.width / 2 + t.options.shift.x + 6, s.height / 2 + t.options.shift.y),
                            this.container.addChild(this.sprite)),
                            e.Base.pixi.root.addChild(this.container),
                            e.Base.addUpdateFunction(this, this.update)
                        }
                        componentWillUnmount() {
                            e.Base.removeUpdateFunction(this, this.update),
                            this.container && (this.container.destroy(),
                            this.container = null)
                        }
                        update() {
                            if (!this.refs.root || !this.container)
                                return;
                            var e = this.refs.root.getBoundingClientRect();
                            e.width && e.height ? (this.container.position.set(e.left, e.top),
                            this.container.visible = !0) : this.container.visible = !1
                        }
                        render() {
                            let e = [this.props.classes.iconBox];
                            return this.props.preSelected && e.push("preSelected"),
                            this.props.selected && e.push("selected"),
                            React.createElement("div", {
                                className: e.join(" "),
                                ref: "root",
                                onClick: () => this.props.onSelect(this.props.itemIcon)
                            })
                        }
                    }
                    ,
                    t("ItemIconBox", n)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/mapblocks/MapBlockBox", [], (function(t, i) {
            "use strict";
            var a, o;
            i && i.id,
            i && i.id;
            return t("getMapBlockBoxStyles", (function() {
                return {
                    iconBox: {
                        border: "1px solid #bbb",
                        borderRadius: 3,
                        padding: 5,
                        margin: 6,
                        cursor: "pointer",
                        background: "#647484",
                        "&.preSelected": {
                            background: "#9ab",
                            borderColor: "#eee"
                        },
                        "&.selected": {
                            background: "#789",
                            borderColor: "#ffd"
                        },
                        "&:hover": {
                            borderColor: "#ffd",
                            background: "rgba(255,255,255, 0.5)"
                        }
                    }
                }
            }
            )),
            {
                setters: [],
                execute: function() {
                    a = e.Base.geom.Size,
                    o = class extends React.Component {
                        constructor(e) {
                            super(e),
                            this.root = React.createRef();
                            let t = this.props.blockType
                              , i = this.props.mapResource || t && t.objResource && t.objResource.mapResource
                              , o = t && t.objResource ? Math.min(1, 3 / Math.max(1, t.objResource.rows)) : 1
                              , s = t && t.objResource && i ? new a(t.objResource.columns * i.tileWidth,t.objResource.rows * i.tileHeight) : new a(1,1);
                            this.container = null,
                            this._mounted = !1,
                            this.state = {
                                scale: o,
                                styles: {
                                    width: s.width * o,
                                    height: s.height * o
                                }
                            }
                        }
                        componentDidMount() {
                            this._mounted = !0,
                            e.Base.addUpdateFunction(this, this.update),
                            this.update()
                        }
                        componentWillUnmount() {
                            this._mounted = !1,
                            e.Base.removeUpdateFunction(this, this.update),
                            this.container && (this.container.children && this.container.children.slice && this.container.children.slice().forEach((e => this.container.removeChild(e))),
                            this.container.parent && this.container.parent.removeChild(this.container),
                            this.container.destroy && (() => {
                                try {
                                    this.container.destroy({
                                        children: !1
                                    })
                                } catch (e) {
                                    this.container.destroy()
                                }
                            }
                            )(),
                            this.container = null)
                        }
                        isVisible(e) {
                            return !!(e && e.width && e.height && e.bottom >= 0 && e.right >= 0 && e.top <= window.innerHeight && e.left <= window.innerWidth)
                        }
                        ensurePreview() {
                            const t = this.props.blockType;
                            if (!t)
                                return null;
                            const i = this.props.mapResource || t.objResource && t.objResource.mapResource
                              , a = this.props.mapRenderer;
                            if (!this._mounted || !e.Base.pixi || !e.Base.pixi.root || e.Base.pixi.root.destroyed)
                                return null;
                            t.sprite && !t.sprite.destroyed || a && i && t.build(i, a),
                            this.container || (this.container = new PIXI.Container,
                            e.Base.pixi.root.addChild(this.container));
                            t.sprite && !t.sprite.destroyed && t.sprite.parent !== this.container && this.container.addChild(t.sprite);
                            let o = t.objRenderer;
                            o && i && t.objResource && (o.scale.set(this.state.scale),
                            o.pivot.set(-t.objResource.baseLocation.x * i.tileWidth, -t.objResource.baseLocation.y * i.tileHeight));
                            let s = t.text;
                            return s && s.position.set(this.state.styles.width / 2, this.state.styles.height - 5),
                            this.container
                        }
                        update() {
                            if (!this.root.current)
                                return;
                            var e = this.root.current.getBoundingClientRect();
                            if (!this.isVisible(e))
                                return void (this.container && (this.container.visible = !1));
                            const t = this.ensurePreview();
                            t && (t.position.set(e.left + 5, e.top + 5),
                            t.visible = !0)
                        }
                        render() {
                            let e = [this.props.classes.iconBox];
                            return this.props.preSelected && e.push("preSelected"),
                            this.props.selected && e.push("selected"),
                            React.createElement("div", {
                                style: this.state.styles,
                                className: e.join(" "),
                                ref: this.root,
                                onClick: () => this.props.onSelect(this.props.blockType)
                            })
                        }
                    }
                    ,
                    t("MapBlockBox", o)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/weaponeditor/WeaponEditorDisplay", [], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g, f, I, w, R, b, y, E, C, T, S, x, W, A;
            i && i.id,
            i && i.id;
            return {
                setters: [],
                execute: function() {
                    a = e.Base.resourceManager,
                    o = e.TWMap.resources.MapResource,
                    s = e.TWMap.data.TiledMap,
                    n = e.TWMap.renderers.MapRenderer,
                    r = e.Base.pixis.cameras.GameCamera,
                    l = e.TwilightWarsLib.games.displays.ActorClip,
                    c = e.TwilightWarsLib.games.dummyGame,
                    p = e.TwilightWarsLib.games.datas.RoleSet,
                    d = e.Base.pixi,
                    h = e.TwilightWarsLib.games.uis.WeaponIconContainer,
                    m = e.TwilightWarsLib.games.items.weapons.CloseWeapon,
                    u = e.TwilightWarsLib.games.items.StuffType,
                    g = e.TwilightWarsLib.games.items.weapons.CustomCloseWeapon,
                    f = e.TwilightWarsLib.games.items.weapons.customs.CustomCloseWeaponInfo,
                    I = e.Base.keyboardManager,
                    w = e.Base.keyboard.KeyboardManagerEvent,
                    R = e.Base.keyboard.Key,
                    b = e.Base.utils.Updater,
                    y = e.Base.geom.Rectangle,
                    E = e.TwilightWarsLib.games.items.StuffManager,
                    C = e.TwilightWarsLib.games.items.weapons.customs.CustomStuffSpriteInfo,
                    T = e.TwilightWarsLib.games.items.weapons.FarWeapon,
                    S = e.TwilightWarsLib.games.items.weapons.ThrowableWeapon,
                    x = e.TwilightWarsLib.GafAliasAssets,
                    W = class extends PIXI.utils.EventEmitter {
                        constructor() {
                            super(),
                            this.mapSource = "CG.TWRoleCgEditor/weaponEditorMap.twmap",
                            this.gameCamera = new r(380,260),
                            this.weaponIndex = 0,
                            d.initialize(600, 500, {
                                padding: {
                                    top: 15,
                                    left: 15
                                }
                            }),
                            a.addAppSource(this.mapSource).load().then(( () => {
                                let e = new o;
                                e.importAppResource(this.mapSource),
                                e.loadTextures().then(( () => {
                                    c._camera = this.gameCamera,
                                    c._mapResource = e,
                                    c._groundRoot = new PIXI.Container,
                                    c._visibleGlobalRect = new y(Number.MIN_SAFE_INTEGER / 10,Number.MIN_SAFE_INTEGER / 10,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER),
                                    c.stuffManager = new E(c),
                                    c.updater = new b,
                                    this.gameCamera.setGameArea(Number.MIN_SAFE_INTEGER / 10, Number.MIN_SAFE_INTEGER / 10, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
                                    let t = new l(c);
                                    this.actorClip = t,
                                    t.setRoleSet(p.OFFICIAL.REVOLUTION_WARRIOR),
                                    t.scale.set(.8);
                                    let i = e.getTileCenterPosition(19, 15);
                                    t.position.set(i.x, i.y),
                                    this.onResourceLoaded(t);
                                    let a = new n(new s(e));
                                    this.mapRenderer = a,
                                    a.build(this.gameCamera),
                                    d.root.addChild(a),
                                    a.gameStage.addChild(c._groundRoot),
                                    a.gameStage.addChild(t);
                                    let o = this.getWeaponGroundPos();
                                    this.gameCamera.position.set((i.x + o.x) / 2 - 15, i.y - 60),
                                    this.gameCamera.gameRoot = a.gameStage,
                                    this.gameCamera.followRate = 1,
                                    this.gameCamera.followSpeedMax = Number.MAX_SAFE_INTEGER,
                                    this.gameCamera.update(),
                                    a.update(this.gameCamera),
                                    I.on(w.DOWN, this.onKeyDown, this),
                                    this.refresh(),
                                    this.emit("loaded")
                                }
                                ))
                            }
                            ))
                        }
                        onResourceLoaded(e) {}
                        getWeaponInfo() {
                            return null
                        }
                        getWeaponGroundPos() {
                            return this.mapRenderer.map.mapResource.getTileCenterPosition(25, 15)
                        }
                        onKeyDown(e) {
                            e == R.Q && this.weaponIcons && (this.weaponIndex = 1 - this.weaponIndex,
                            this.weaponIcons.swapTo(this.weaponIndex))
                        }
                        showArrowClip() {
                            if (!this.arrowClip) {
                                this.arrowClip = a.createGAFMovieClip(x, "lib_symbol_arrow"),
                                this.arrowClip.rotationDeg = 45;
                                let e = this.getWeaponGroundPos();
                                this.arrowClip.position.set(e.x - 24, e.y - 24)
                            }
                            c._groundRoot.addChild(this.arrowClip)
                        }
                        hideArrowClip() {
                            this.arrowClip && d.removeFromParent(this.arrowClip)
                        }
                        listClipAlias() {
                            return [this.getWeaponInfo().clipAlias]
                        }
                        refresh() {
                            this.hideArrowClip();
                            let t = !1;
                            this.listClipAlias().forEach((i => {
                                !i || e.Base.pixi.gafManager.isGafLoaded(i) || a.getLoaderResource(i) || (a.addAppResource(i),
                                t = !0)
                            }
                            )),
                            t ? a.load().then(( () => this.update())) : this.update()
                        }
                        getSpriteInfo() {
                            let e = this.getWeaponInfo()
                              , t = e.spriteInfo;
                            return t || (t = new C(e,{
                                clipFrame: 1,
                                pivotOnHand: {
                                    x: 0,
                                    y: 0
                                }
                            }),
                            e.spriteInfo = t),
                            t
                        }
                        attachWeaponSprite() {}
                        update() {
                            if (c.updater.removeUpdateFunction(this, this.fireUpdate),
                            this.actorClip) {
                                let e = this.getWeaponInfo();
                                this.attachWeaponSprite(),
                                this.weaponGround && (this.weaponGround.dispose(),
                                this.weaponGround = null);
                                let t = this.getWeaponGroundPos();
                                e.isFar ? this.weaponGround = new T(c,-1,e,!1,null) : e.isThrowable ? this.weaponGround = new S(c,-1,e,!1,null) : this.weaponGround = new g(c,-1,e,!1,null),
                                this.weaponGround.initOnGround(t.x, t.y, 0),
                                this.weaponIcons && this.weaponIcons.dispose(),
                                this.weaponIcons = new h(c),
                                d.root.addChild(this.weaponIcons),
                                this.weaponIcons.position.set(this.gameCamera.width - 120, -20),
                                this.weaponIndex = 0,
                                this.weaponIcons.initialize([this.weaponGround, new m(c,-1,u.KNIFE,!1,null)], this.weaponIndex),
                                this.onClipsUpdated()
                            }
                        }
                        onClipsUpdated() {}
                        fireUpdate(e) {
                            this.animTimepassed += e
                        }
                    }
                    ,
                    t("WeaponEditorDisplay", W),
                    A = class extends W {
                        constructor() {
                            super(...arguments),
                            this.fireIndex = 0,
                            this._weaponInfo = new f("customWeapon")
                        }
                        getWeaponInfo() {
                            return this._weaponInfo
                        }
                        onResourceLoaded(e) {
                            e.setBodyFrame("IDLE_BLADE_TYPE", !1)
                        }
                        attachWeaponSprite() {
                            let e = this.getSpriteInfo();
                            this.weaponSprite && (this.weaponSprite.destroy(),
                            this.weaponSprite = null),
                            this.weaponSprite = e.createClipOnHand(),
                            this.actorClip.bodyAnimation.blade.addChild(this.weaponSprite)
                        }
                        onKeyDown(e) {
                            e == R.F ? this._weaponInfo.fireInfos.length && (this.setFireIndex(0),
                            this.actorClip.bodyRotation = 0,
                            this.firePlayAll = !1,
                            c.updater.addUpdateFunction(this, this.fireUpdate)) : e == R.C ? this._weaponInfo.fireInfos.length && (this.setFireIndex(0),
                            this.actorClip.bodyRotation = 0,
                            this.firePlayAll = !0,
                            c.updater.addUpdateFunction(this, this.fireUpdate)) : super.onKeyDown(e)
                        }
                        setFireIndex(e) {
                            this.animTimepassed = 0,
                            this.fireIndex = e,
                            this._weaponInfo.importFireIndex(this.fireIndex),
                            this.actorClip.bodyAnimation.gotoAndStop(this._weaponInfo.fireStartFrame)
                        }
                        onClipsUpdated() {
                            this._weaponInfo.importFireIndex(0),
                            this.actorClip.bodyAnimation.gotoAndStop(this._weaponInfo.fireStartFrame)
                        }
                        fireUpdate(e) {
                            super.fireUpdate(e);
                            let t = this._weaponInfo.fireStartFrame + Math.floor(this.animTimepassed / 33);
                            if (t <= this._weaponInfo.fireEndFrame) {
                                if (this.actorClip.bodyAnimation.gotoAndStop(t),
                                this.fireIndex + 1 < this._weaponInfo.fireInfos.length && this.firePlayAll) {
                                    this._weaponInfo.fireInfos[this.fireIndex].fireType.isComboPoint(t) && this.setFireIndex(this.fireIndex + 1)
                                }
                            } else
                                this.setFireIndex(0),
                                c.updater.removeUpdateFunction(this, this.fireUpdate);
                            this.actorClip.bodyRotation = 0
                        }
                        setWeaponInfo(e) {
                            this._weaponInfo.parseJson(e),
                            this._weaponInfo.clipAlias || (this._weaponInfo.clipAlias = "TwilightWarsLib.actors",
                            this._weaponInfo.clip = "lib_actor_blade"),
                            this.refresh()
                        }
                    }
                    ,
                    t("CloseWeaponEditorDisplay", A)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/itemeditor/ItemEditorDisplay", [], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g, f, I, w, R, b, y, E, C, T, S, x, W, A, M, v, B, D;
            i && i.id,
            i && i.id;
            function P() {}
            return {
                setters: [],
                execute: function() {
                    a = e.Base.pixi,
                    o = e.Base.resourceManager,
                    s = e.TWMap.renderers.MapRenderer,
                    n = e.Base.pixis.cameras.GameCamera,
                    r = e.TWMap.resources.MapResource,
                    l = e.TwilightWarsLib.games.dummyGame,
                    c = e.Base.geom.Rectangle,
                    p = e.TwilightWarsLib.games.items.StuffManager,
                    d = e.Base.utils.Updater,
                    h = e.TwilightWarsLib.games.datas.RoleSet,
                    m = e.TWMap.data.TiledMap,
                    u = e.Base.geom.Point,
                    g = e.TwilightWarsLib.games.items.weapons.customs.CustomStuffSpriteInfo,
                    f = e.TwilightWarsLib.games.items.Stuff,
                    I = e.TwilightWarsLib.games.items.mapitems.customs.CustomItemInfo,
                    w = e.TwilightWarsLib.games.items.mapitems.EquipItem,
                    R = e.TwilightWarsLib.games.actors.Actor,
                    b = e.TwilightWarsLib.games.datas.Camp,
                    y = e.TwilightWarsLib.games.datas.RoleDesignData,
                    E = e.TwilightWarsLib.games.SocketMessenger,
                    C = e.Server.messages.managers.GameroomManager,
                    T = e.Server.messages.vo.GameroomFull,
                    S = e.TwilightWarsLib.games.GameObjListManager,
                    x = e.TwilightWarsLib.games.items.StuffType,
                    W = e.Base.keyboardManager,
                    A = e.Base.keyboard.Key,
                    M = e.CgEventsLib.utils.MouseProxy,
                    v = e.TwilightWarsLib.games.uis.counters.ScheduledUpdateCounter,
                    B = new M,
                    D = class extends PIXI.utils.EventEmitter {
                        constructor() {
                            super(),
                            this.mapSource = "CG.TWRoleCgEditor/weaponEditorMap.twmap",
                            this.gameCamera = new n(380,190),
                            this.itemInfo = new I("customItem"),
                            this.actorMouse = new u,
                            a.initialize(600, 500, {
                                padding: {
                                    top: 15,
                                    left: 15
                                }
                            }),
                            o.addAppSource(this.mapSource).load().then(( () => {
                                let e = new r;
                                e.importAppResource(this.mapSource),
                                e.loadTextures().then(( () => {
                                    (new C)._roomFull = new T({
                                        room: {
                                            code: "",
                                            maxPlayers: 1
                                        }
                                    }),
                                    l.socketMessenger = new E(l),
                                    l._camera = this.gameCamera,
                                    l._mapResource = e,
                                    l._groundRoot = new PIXI.Container,
                                    l._visibleGlobalRect = new c(Number.MIN_SAFE_INTEGER / 10,Number.MIN_SAFE_INTEGER / 10,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER),
                                    l.stuffManager = new p(l),
                                    l.objListManager = new S(l),
                                    l.addToObjectRoot = P,
                                    l.isThisWatcher = () => !0,
                                    l.hasSkyAlphaTile = () => !1,
                                    l.isSkyAlphable = () => !1,
                                    l.updater = new d,
                                    this.gameCamera.setGameArea(Number.MIN_SAFE_INTEGER / 10, Number.MIN_SAFE_INTEGER / 10, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
                                    let t = e.getTileCenterPosition(19, 15)
                                      , i = this.actor = new R(l,"me");
                                    i.updateNickname = P,
                                    i.setDefaultWeaponType(0, x.KONGFU),
                                    i.setDefaultWeaponType(1, x.KONGFU),
                                    i.initActor(b.CAMP1, y.createFromRoleSet(h.OFFICIAL.REVOLUTION_WARRIOR), t.x, t.y, 0, null);
                                    let o = i.actorClip;
                                    o.scale.set(.8),
                                    o.position.set(t.x, t.y),
                                    o.setBodyFrame("IDLE_KONGFU_TYPE", !1);
                                    let n = new s(new m(e));
                                    this.mapRenderer = n,
                                    n.build(this.gameCamera),
                                    a.root.addChild(n),
                                    n.gameStage.addChild(l._groundRoot),
                                    n.gameStage.addChild(o);
                                    let r = this.getItemGroundPos();
                                    this.gameCamera.position.set((t.x + r.x) / 2 - 15, t.y - 15),
                                    this.gameCamera.gameRoot = n.gameStage,
                                    this.gameCamera.followRate = 1,
                                    this.gameCamera.followSpeedMax = Number.MAX_SAFE_INTEGER,
                                    this.gameCamera.update(),
                                    n.update(this.gameCamera),
                                    this.uiCounter = new v(l,"counter"),
                                    this.uiCounter.display.position.set(this.gameCamera.width / 2 - 12, 5),
                                    this.uiCounter.importOptions({
                                        total: 10,
                                        initCountValue: 5
                                    }),
                                    a.root.addChild(this.uiCounter.display),
                                    this.refresh(),
                                    l.updater.addUpdateFunction(this, this.updateControls),
                                    this.emit("loaded")
                                }
                                ))
                            }
                            ))
                        }
                        getItemGroundPos() {
                            return this.mapRenderer.map.mapResource.getTileCenterPosition(25, 15)
                        }
                        setItemInfo(e) {
                            this.itemInfo.parseJson(e),
                            this.itemInfo.clipAlias && this.refresh()
                        }
                        refresh() {
                            let t = this.itemInfo.clipAlias;
                            t && (e.Base.pixi.gafManager.isGafLoaded(t) || e.Base.resourceManager.getLoaderResource(t) ? this.update() : e.Base.resourceManager.addAppResource(t).load().then(( () => this.update())))
                        }
                        update() {
                            if (this.actor) {
                                let e = this.actor.actorClip
                                  , t = this.itemInfo
                                  , i = t.spriteInfo;
                                if (i || (i = new g(t,{
                                    clipFrame: 1,
                                    pivotOnHand: {
                                        x: 0,
                                        y: 0
                                    }
                                }),
                                t.spriteInfo = i),
                                e.headClip.clearAttachments(!0),
                                e.capeClip.clearAttachments(!0),
                                e.removeAttachmentAboveFoot(),
                                e.removeAttachmentUnderFoot(),
                                this.equipItem && (this.equipItem.dispose(),
                                this.equipItem = null),
                                t.equipConfig) {
                                    let e = this.equipItem = new w(l,0,t,!1,{});
                                    e.initialize(0, 0, 0),
                                    e.pickOnGround(this.actor)
                                }
                                this.itemGround && (this.itemGround.dispose(),
                                this.itemGround = null);
                                let a = this.getItemGroundPos();
                                this.itemGround = new f(l,1,t,!0,{}),
                                this.itemGround.initOnGround(a.x, a.y, 0);
                                let o = i.createClipOnIcon();
                                this.uiCounter.display.setCustomIcon(o, {
                                    shift: u.fromXY(t.iconShiftX, t.iconShiftY),
                                    scale: t.scaleOnIcon,
                                    width: 12
                                })
                            }
                        }
                        updateControls() {
                            let e = this.actor
                              , t = e.actorClip;
                            e.velocity.set(0, 0),
                            (W.isDown(A.LEFT) || W.isDown(A.A)) && (e.velocity.x -= 1),
                            (W.isDown(A.RIGHT) || W.isDown(A.D)) && (e.velocity.x += 1),
                            (W.isDown(A.UP) || W.isDown(A.W)) && (e.velocity.y -= 1),
                            (W.isDown(A.DOWN) || W.isDown(A.S)) && (e.velocity.y += 1);
                            let i = Math.atan2(e.velocity.y, e.velocity.x);
                            e.velocity.x || e.velocity.y ? t.setWalking(!0) : t.setWalking(!1),
                            B.getLocalPosition(t, this.actorMouse),
                            e.setBodyRotation(Math.atan2(this.actorMouse.y, this.actorMouse.x)),
                            e.updateRealBodyRotation(.25),
                            e.setRotation(t.calcFootRotation(i, e.bodyRotation)),
                            e.updateFeetRotation(.1)
                        }
                    }
                    ,
                    t("ItemEditorDisplay", D)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/farweaponeditor/FarWeaponEditorDisplay", ["./../weaponeditor/WeaponEditorDisplay"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p;
            i && i.id,
            i && i.id;
            function d(e, t) {
                const i = e.bodyAnimation
                  , a = t.animClip;
                i.children.forEach((e => {
                    e.name && (e.name.startsWith("weaponReload") ? h(e, t, a.reload) : e.name.startsWith("weapon") && h(e, t, a.weapon))
                }
                ))
            }
            function h(e, t, i) {
                if (i) {
                    let a = e.children.find((e => e.recycleId));
                    if (a) {
                        let e = i.pivot || t.spriteInfo.pivotOnHand;
                        a.pivot.set(e.x, e.y),
                        a.rotation = l.degrees2radians(e.degrees),
                        a.scale && a.scale.set(e.scale.x, e.scale.y)
                    }
                }
            }
            return t("pivotWeaponParts", d),
            {
                setters: [function(e) {
                    a = e
                }
                ],
                execute: function() {
                    o = e.TwilightWarsLib.games.items.weapons.customs.CustomFarWeaponInfo,
                    s = e.TwilightWarsLib.games.dummyGame,
                    n = e.Base.keyboard.Key,
                    r = e.Base.utils.ArrayUtil,
                    l = e.Base.utils.MathUtil,
                    c = e.TwilightWarsLib.games.items.StuffType,
                    p = class extends a.WeaponEditorDisplay {
                        constructor() {
                            super(...arguments),
                            this._weaponInfo = new o("customFarWeapon"),
                            this.animating = ""
                        }
                        getWeaponInfo() {
                            return this._weaponInfo
                        }
                        listClipAlias() {
                            let e = super.listClipAlias();
                            return [this._weaponInfo.animClip.reload, this._weaponInfo.animClip.weapon].forEach((t => {
                                t && t.alias && r.addUniqueElement(e, t.alias)
                            }
                            )),
                            e
                        }
                        onResourceLoaded(e) {
                            this.idle()
                        }
                        idle() {
                            this.actorClip.setBodyFrame(this._weaponInfo.idleFrameName, !1, 1),
                            this.attachWeaponSprite()
                        }
                        attachWeaponSprite() {
                            e.TwilightWarsLib.games.actors.attachWeaponParts(this.actorClip, this._weaponInfo),
                            e.TwilightWarsLib.games.actors.refreshAimItemVisibility(this.actorClip, !1),
                            d(this.actorClip, this._weaponInfo)
                        }
                        setWeaponInfo(e) {
                            this._weaponInfo.parseJson(e),
                            this.refresh()
                        }
                        onClipsUpdated() {
                            if (this.animating) {
                                let e = this.animating;
                                this.animating = "",
                                "reload" == e ? this.playReloadAnim() : this.playFireAnim(e)
                            } else
                                this.attachWeaponSprite()
                        }
                        fireUpdate(e) {
                            super.fireUpdate(e);
                            const t = this.actorClip.bodyAnimation;
                            let i = this._weaponInfo.fireStartFrame || 2
                              , a = i + Math.floor(this.animTimepassed / 33);
                            a <= (this._weaponInfo.fireEndFrame || t.totalFrames) ? (this.actorClip.bodyAnimation.gotoAndStop(a),
                            this._weaponInfo.animType == c.DOUBLE_GUNS && 13 == a && this.attachWeaponSprite()) : "shoots" == this.animating ? this.animTimepassed > this._weaponInfo.fireDelay && (this.animTimepassed = 0,
                            this.actorClip.bodyAnimation.gotoAndStop(i),
                            this.attachWeaponSprite()) : this.stopAnimatings(),
                            this.actorClip.bodyRotation = 0
                        }
                        stopAnimatings() {
                            this.actorClip.bodyAnimation.stop(!1),
                            this.animating = "",
                            s.updater.removeUpdateFunction(this, this.fireUpdate),
                            s.updater.removeUpdateFunction(this, this.reloadUpdate)
                        }
                        reloadUpdate(e) {
                            this.animTimepassed += e;
                            const t = this.actorClip.bodyAnimation;
                            t.currentFrame >= t.totalFrames - 1 && t.gotoAndPlay(1)
                        }
                        playReloadAnim() {
                            let e = "reload" != this.animating;
                            this.stopAnimatings(),
                            e && (this.animating = "reload",
                            this.animTimepassed = 0,
                            this.actorClip.setBodyFrame(this._weaponInfo.reloadFrameName, !0),
                            this.attachWeaponSprite(),
                            s.updater.addUpdateFunction(this, this.reloadUpdate))
                        }
                        onKeyDown(e) {
                            e == n.F ? this.playFireAnim("fire") : e == n.C ? this.playFireAnim("shoots") : e == n.R ? this.playReloadAnim() : super.onKeyDown(e)
                        }
                        playFireAnim(e) {
                            let t = this.animating != e;
                            this.stopAnimatings(),
                            t ? (this.animating = e,
                            this.animTimepassed = 0,
                            this.actorClip.setBodyFrame(this._weaponInfo.fireFrameName, !0, this._weaponInfo.fireStartFrame || 2),
                            this.attachWeaponSprite(),
                            s.updater.addUpdateFunction(this, this.fireUpdate)) : this.idle()
                        }
                    }
                    ,
                    t("FarWeaponEditorDisplay", p)
                }
            }
        }
        )),
        System.register("TWRoleCgEditor/throwableEditor/ThrowableWeaponEditorDisplay", ["./../weaponeditor/WeaponEditorDisplay", "./FireworkParticle"], (function(t, i) {
            "use strict";
            var a, o, s, n, r, l, c, p, d, h, m, u, g;
            i && i.id,
            i && i.id;
            function f(e, t) {
                const i = t.clipToThrow;
                i.x = t.actorClip.x + 192 * e,
                i.scale.set(.6 + 2 * Math.sin(e * Math.PI)),
                i.alpha = Math.min(1, 2 - 2 * e),
                t.shadow.alpha = i.alpha;
                let a = d.polar(i.scale.x / .03, r.QUATER_PI);
                t.shadow.position.set(i.x + a.x, i.y + a.y)
            }
            function I(e, t) {
                f(e, t);
                const i = t.clipToThrow;
                t._weaponInfo.noSpin || (i.rotation = e * Math.PI * 4)
            }
            function w(t, i) {
                const a = i.clipToThrow;
                if (a.x = i.actorClip.x + 240 * t,
                1 == t) {
                    const e = 128;
                    let t = i.maskOnWall;
                    i.maskOnWall || (i.maskOnWall = t = new PIXI.Graphics,
                    t.beginFill(0),
                    t.drawRect(0, 0, e, e),
                    t.endFill()),
                    t.position.set(a.x - e + 1, a.y - e / 2),
                    a.x -= 5,
                    a.parent.addChild(t),
                    a.mask = t,
                    i.shadow.alpha = 0;
                    const o = i.getWeaponInfo()
                      , s = o.refType;
                    let n = Math.PI;
                    o.clipAlias == s.clipAlias && o.clip == s.clip || (n += o.rotationOnWall),
                    a.rotation = n
                } else {
                    i.maskOnWall && e.Base.pixi.removeFromParent(i.maskOnWall),
                    a.mask = null,
                    a.scale.set(1),
                    a.rotation = -16 * t,
                    a.alpha = 1,
                    i.shadow.alpha = a.alpha;
                    let o = d.polar(a.scale.x / .05, r.QUATER_PI);
                    i.shadow.position.set(a.x + o.x, a.y + o.y)
                }
            }
            function R(e, t) {
                const i = t.clipToThrow
                  , a = t.getWeaponInfo();
                if (1 == e) {
                    i.alpha = 0;
                    const e = h.getByCode(t._weaponInfo.refType.code) || h.WHITE
                      , a = t.gameCamera.gameRoot;
                    for (let t = 0; t < 50; ++t)
                        b(a, i.x, i.y, e)
                } else
                    i.alpha = 1,
                    e *= 1.1,
                    i.x = t.actorClip.x + 240 * Math.sin(Math.min(1, e) * r.HALF_PI),
                    e > 1 ? i.scale.set(.64 * i.scaleX) : (i.rotation = a.throwRotation,
                    i.scale.set(a.throwScale * (1 + Math.sqrt(Math.min(1, e)) * a.throwDeltaScale)))
            }
            function b(e, t, i, a) {
                let o = 10 + 80 * Math.sin(Math.random() * r.HALF_PI);
                a != h.BLACK && Math.random() < .06 && (a = h.WHITE);
                let s = m.FireworkParticle.getInstance();
                s.tint = a.randTint,
                e.addChild(s.clip),
                s.fly(t, i, Math.random() * r.TWO_PI, o)
            }
            return {
                setters: [function(e) {
                    a = e
                }
                , function(e) {
                    m = e
                }
                ],
                execute: function() {
                    o = e.TwilightWarsLib.games.dummyGame,
                    s = e.Base.keyboard.Key,
                    n = e.Base.utils.ArrayUtil,
                    r = e.Base.utils.MathUtil,
                    l = e.TwilightWarsLib.games.items.weapons.customs.CustomThrowableWeaponInfo,
                    c = e.TwilightWarsLib.games.items.StuffType,
                    p = e.TwilightWarsLib.GafAliasAssets,
                    d = e.Base.geom.Point,
                    h = e.TWLibLib.games.effects.fireworks.FireworkColor,
                    u = e.TwilightWarsLib.games.displays.StuffIcon,
                    g = class extends a.WeaponEditorDisplay {
                        constructor() {
                            super(...arguments),
                            this._weaponInfo = new l("customThrowableWeapon"),
                            this.animating = "",
                            this.fireTimepassed = 0,
                            this.fireDuration = 600
                        }
                        getWeaponInfo() {
                            return this._weaponInfo
                        }
                        listClipAlias() {
                            let e = super.listClipAlias();
                            return [this._weaponInfo.animClip.reload, this._weaponInfo.animClip.weapon].forEach((t => {
                                t && t.alias && n.addUniqueElement(e, t.alias)
                            }
                            )),
                            e
                        }
                        onResourceLoaded(e) {
                            this.idle()
                        }
                        idle() {
                            this.actorClip.setBodyFrame(this._weaponInfo.idleFrameName, !1, 1),
                            this.clipOnHand || (this.clipOnHand = new PIXI.Container,
                            this.clipOnHand.addChild(this._weaponInfo.createClipOnHand())),
                            this.actorClip.attachRightHandWeapon(this.clipOnHand, !0, null);
                            const e = this._weaponInfo.adjustWeaponOnRightHand;
                            this.clipOnHand.position.set(e.x, e.y),
                            this.clipOnHand.rotation = e.rotation,
                            this.clipOnHand.scale.set(e.scaleX || 1, e.scaleY || 1)
                        }
                        setWeaponInfo(e) {
                            this._weaponInfo.parseJson(e),
                            this.refresh()
                        }
                        attachWeaponSprite() {
                            this.clipOnHand && (this.clipOnHand.destroy(),
                            this.clipOnHand = null),
                            this.clipToThrow && (this.clipToThrow.destroy(),
                            this.clipToThrow = null),
                            this.shadow && (this.shadow.destroy(),
                            this.shadow = null),
                            this.maskOnWall && (this.maskOnWall.destroy(),
                            this.maskOnWall = null),
                            this.idle()
                        }
                        onClipsUpdated() {
                            if (this._weaponInfo.refType.code.includes("esBall") && !this._weaponInfo.noArrow ? this.showArrowClip() : this.hideArrowClip(),
                            this.animating) {
                                let e = this.animating;
                                this.animating = "",
                                this.playFireAnim(e)
                            }
                        }
                        fireUpdate(e) {
                            super.fireUpdate(e);
                            const t = this.actorClip.bodyAnimation;
                            let i = this.fireAnimUpdate || f;
                            this.fireTimepassed += e;
                            let a = (this._weaponInfo.fireStartFrame || 1) + Math.floor(this.animTimepassed / 33);
                            a <= (this._weaponInfo.fireEndFrame || t.totalFrames) ? this.actorClip.bodyAnimation.gotoAndStop(a) : this.fireTimepassed > this._weaponInfo.fireTime && this.idle();
                            let o = Math.min(1, this.fireTimepassed / this.fireDuration);
                            i(o, this),
                            1 == o && this.stopAnimatings(),
                            this.actorClip.bodyRotation = 0
                        }
                        stopAnimatings() {
                            this.actorClip.bodyAnimation.gotoAndStop(1),
                            this.animating = "",
                            o.updater.removeUpdateFunction(this, this.fireUpdate)
                        }
                        onKeyDown(e) {
                            e == s.F ? this.playFireAnim("fire") : super.onKeyDown(e)
                        }
                        playFireAnim(t) {
                            let i = this.animating != t;
                            if (this.stopAnimatings(),
                            i) {
                                this.animating = t,
                                this.animTimepassed = 0,
                                this.actorClip.setBodyFrame(this._weaponInfo.fireFrameName, !0, this._weaponInfo.fireStartFrame || 1),
                                this.actorClip.removeRightHandWeapon(!1);
                                const i = this._weaponInfo.refType;
                                if (i.code.startsWith("firework") ? this.fireAnimUpdate = R : i == c.HATCHET ? this.fireAnimUpdate = w : i.code.includes("esBall") ? this.fireAnimUpdate = I : this.fireAnimUpdate = f,
                                o.updater.addUpdateFunction(this, this.fireUpdate),
                                !this.shadow) {
                                    const t = "number" == typeof this._weaponInfo.shadowRadius ? this._weaponInfo.shadowRadius : 8;
                                    this.shadow = e.Base.resourceManager.createGAFMovieClip(p, "lib_actor_shadow"),
                                    this.shadow.scale.set(t / 16),
                                    this.gameCamera.gameRoot.addChildAt(this.shadow, 0)
                                }
                                this.clipToThrow || (this.clipToThrow = new PIXI.Container,
                                this.clipToThrow.addChild(function(e) {
                                    const t = e.refType;
                                    if (t.code.startsWith("firework")) {
                                        if (e.clipAlias == t.clipAlias && e.clip == t.clip) {
                                            const e = h.getByCode(t.code)
                                              , i = new m.FireworkParticle;
                                            return i.tint = e.mainTint,
                                            i.clip
                                        }
                                        return u.getIconClip(e)
                                    }
                                    return e.createClipOnHand()
                                }(this._weaponInfo))),
                                this.shadow.position.copyFrom(this.actorClip.position),
                                this.clipToThrow.position.copyFrom(this.actorClip.position),
                                this.clipToThrow.alpha = 0,
                                this.gameCamera.gameRoot.addChild(this.clipToThrow),
                                this.fireTimepassed = 0
                            } else
                                this.idle()
                        }
                    }
                    ,
                    t("ThrowableWeaponEditorDisplay", g)
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
                            this.root.removeChild(this.head.clip),
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
                            let a = this.items.indexOf(t);
                            -1 != a && (i >= a && i--,
                            this.items.splice(a, 1)),
                            this.items.splice(i, 0, t),
                            this.root.removeChild(t.clip),
                            this.root.addChildAt(t.clip, i),
                            this.emit(e.EVENT.DECOLIST, this.items)
                        }
                        removeDeco(t) {
                            n.removeElement(this.items, t),
                            this.root.removeChild(t.clip),
                            this.emit(e.EVENT.DECOLIST, this.items)
                        }
                        selectDecos(t) {
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
                            let t = e.map((e => this.items[e]));
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
        System.register("TWRoleCgEditor/throwableEditor/FireworkParticle", [], (function(t, i) {
            "use strict";
            var a, o, s, n;
            i && i.id,
            i && i.id;
            return {
                setters: [],
                execute: function() {
                    a = e.Base.utils.MathUtil,
                    o = e.Base.geom.Point,
                    s = e.TWLibLib.GafAliasAssets,
                    n = [],
                    t("FireworkParticle", class t {
                        static getInstance() {
                            return n.length ? n.shift() : new t
                        }
                        constructor() {
                            this.flyRate = 1,
                            this.fadeoutTimer = 0,
                            this.target = new o,
                            this.direction = new o,
                            this.clip = e.Base.resourceManager.createGAFMovieClip(s, "lib_firework_particle")
                        }
                        recycle() {
                            this.stop(),
                            n.push(this)
                        }
                        dispose() {
                            this.stop(),
                            this.clip.disposed || this.clip.destroy()
                        }
                        stop() {
                            this.active && (this.active = !1),
                            e.Base.pixi.removeFromParent(this.clip),
                            this.flyUpdateObj && (this.flyUpdateObj.dispose(),
                            this.flyUpdateObj = null),
                            this.fadeoutStartObj && (this.fadeoutStartObj.dispose(),
                            this.fadeoutStartObj = null),
                            e.Base.removeUpdateFunction(this, this.fadeoutUpdate)
                        }
                        get disposed() {
                            return this.clip.disposed
                        }
                        set tint(e) {
                            this._tint = e,
                            this.clip._displayObjectsVector.forEach((t => {
                                t.tint = e
                            }
                            ))
                        }
                        activate() {
                            this.active || (this.active = !0,
                            this.clip.alpha = 1,
                            this.fadeoutTimer = 0,
                            this.clip.scale.set(1),
                            this.clip.position.set(0, 0))
                        }
                        fadeout(t) {
                            this.activate(),
                            this.clip.gotoAndStop(1),
                            this.fadeoutDuration = t,
                            e.Base.addUpdateFunction(this, this.fadeoutUpdate)
                        }
                        fadeoutUpdate(e) {
                            this.fadeoutTimer += e;
                            let t = Math.cos(Math.min(1, this.fadeoutTimer / this.fadeoutDuration) * a.HALF_PI);
                            t < .2 ? this.recycle() : this.clip.scale.set(t)
                        }
                        fly(t, i, a, o) {
                            this.activate(),
                            this.clip.position.set(t, i),
                            this.clip.gotoAndStop(2),
                            this.direction.set(Math.cos(a), Math.sin(a)),
                            this.target.set(t + this.direction.x * o, i + this.direction.y * o),
                            this.direction.scale(.2),
                            this.dist = o,
                            this.flyRate = .2 + .3 * Math.random(),
                            this.clip.scale.set(1.5),
                            this.flyUpdateObj = e.Base.addDelayFunction(this, this.flyUpdate, 30),
                            this.fadeoutStartObj = e.Base.addDelayFunction(this, this.fadeout, 1e3, [2e3])
                        }
                        createFlyTail() {
                            if (!this.clip || !this.clip.parent)
                                return;
                            let e = t.getInstance();
                            e && !e.disposed && (this.clip.parent.addChild(e.clip),
                            e.tint = this._tint,
                            e.fadeout(140),
                            e.clip.position.set(this.clip.x, this.clip.y))
                        }
                        flyUpdate() {
                            if (!this.active || this.disposed)
                                return;
                            0 == this.fadeoutTimer && this.dist > 75 && this.createFlyTail(),
                            a.pointFollowTarget(this.clip.position, this.target, this.flyRate, 0),
                            this.target.x += this.direction.x,
                            this.target.y += this.direction.y,
                            this.clip.scale.set(Math.max(.5, this.clip.scaleX - .03)),
                            Math.random() > this.clip.scaleX - .1 ? this.clip.alpha = .4 + .4 * Math.random() : this.clip.alpha = 1,
                            this.flyUpdateObj = e.Base.addDelayFunction(this, this.flyUpdate, 30)
                        }
                    }
                    )
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
                            this.manager.editor.pushHistory())
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
        CgLibs.bootLib("TWRoleCgEditor/app", ["TWRoleCgEditor/app", "TWRoleCgEditor/appInit", "TWRoleCgEditor/helpers/HelperApp", "TWRoleCgEditor/viewers/ViewerApp", "TWRoleCgEditor/libs/Utils", "TWRoleCgEditor/viewers/WeaponViewer", "TWRoleCgEditor/weapons/WeaponApp", "TWRoleCgEditor/itemicons/ItemIconApp", "TWRoleCgEditor/viewers/ItemIconViewer", "TWRoleCgEditor/mapblocks/MapBlockApp", "TWRoleCgEditor/viewers/MapBlockViewer", "TWRoleCgEditor/roleeditor/RoleEditorApp", "TWRoleCgEditor/roleeditor/InGameRoleEditorApp", "TWRoleCgEditor/weaponeditor/WeaponEditorApp", "TWRoleCgEditor/viewers/CustomWeaponViewer", "TWRoleCgEditor/viewers/CustomItemViewer", "TWRoleCgEditor/itemeditor/ItemEditorApp", "TWRoleCgEditor/mapobjs/MapObjectApp", "TWRoleCgEditor/viewers/MapObjectViewer", "TWRoleCgEditor/farweaponeditor/FarWeaponEditorApp", "TWRoleCgEditor/throwableEditor/ThrowableWeaponEditorApp", "TWRoleCgEditor/translations/index", "TWRoleCgEditor/ResourceGate", "TWRoleCgEditor/BaseHelperApp", "TWRoleCgEditor/BaseViewerApp", "TWRoleCgEditor/mapblocks/MapBlockInfo", "TWRoleCgEditor/helpers/Index", "TWRoleCgEditor/weapons/WeaponChooser", "TWRoleCgEditor/itemicons/ItemIconChooser", "TWRoleCgEditor/mapblocks/MapBlockChooser", "TWRoleCgEditor/weaponeditor/WeaponEditor", "TWRoleCgEditor/itemeditor/ItemEditor", "TWRoleCgEditor/farweaponeditor/FarWeaponEditor", "TWRoleCgEditor/throwableEditor/ThrowableWeaponEditor", "TWRoleCgEditor/translations/trans.en", "TWRoleCgEditor/translations/trans.zh", "TWRoleCgEditor/translations/trans.cn", "TWRoleCgEditor/roleeditor/RoleEditor", "TWRoleCgEditor/helpers/RoleSetBox", "TWRoleCgEditor/weapons/WeaponBox", "TWRoleCgEditor/weapons/StoreItemBox", "TWRoleCgEditor/itemicons/ItemIconBox", "TWRoleCgEditor/mapblocks/MapBlockBox", "TWRoleCgEditor/weaponeditor/WeaponEditorDisplay", "TWRoleCgEditor/itemeditor/ItemEditorDisplay", "TWRoleCgEditor/farweaponeditor/FarWeaponEditorDisplay", "TWRoleCgEditor/throwableEditor/ThrowableWeaponEditorDisplay", "TWRoleCgEditor/roleeditor/DecoManager", "TWRoleCgEditor/roleeditor/DecoItem", "TWRoleCgEditor/roleeditor/fixIngameRoleDesign", "TWRoleCgEditor/roleeditor/DecoConstant", "TWRoleCgEditor/throwableEditor/FireworkParticle", "TWRoleCgEditor/roleeditor/DecoController"])
    }
};
//dqwqwd        