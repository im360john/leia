var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/render.tsx
import { convert } from "html-to-text";

// src/utils/pretty.ts
import { format } from "prettier/standalone";
import html from "prettier/plugins/html";
var defaults = {
  endOfLine: "lf",
  tabWidth: 2,
  plugins: [html],
  parser: "html"
};
var pretty = (str, options = {}) => {
  return format(str, __spreadValues(__spreadValues({}, defaults), options));
};

// src/plain-text-selectors.ts
var plainTextSelectors = [
  { selector: "img", format: "skip" },
  { selector: "#__react-email-preview", format: "skip" },
  {
    selector: "a",
    options: { linkBrackets: false }
  }
];

// src/renderer/renderer.tsx
import ReactServer from "react-server";

// src/renderer/escape-html.ts
var matchHtmlRegExp = /["'&<>]/;
function escapeHtml(string) {
  const str = "" + string;
  const match = matchHtmlRegExp.exec(str);
  if (!match) {
    return str;
  }
  let escape;
  let html2 = "";
  let index;
  let lastIndex = 0;
  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34:
        escape = "&quot;";
        break;
      case 38:
        escape = "&amp;";
        break;
      case 39:
        escape = "&#x27;";
        break;
      case 60:
        escape = "&lt;";
        break;
      case 62:
        escape = "&gt;";
        break;
      default:
        continue;
    }
    if (lastIndex !== index) {
      html2 += str.slice(lastIndex, index);
    }
    lastIndex = index + 1;
    html2 += escape;
  }
  return lastIndex !== index ? html2 + str.slice(lastIndex, index) : html2;
}
function escapeTextForBrowser(text) {
  if (typeof text === "object")
    return JSON.stringify(text);
  if (typeof text === "boolean" || typeof text === "number" || typeof text === "bigint") {
    return "" + text;
  }
  return escapeHtml(text);
}

// src/renderer/attribute-processing/boolean-prop-to-html-attribute.ts
function booleanPropToHtmlAttribute(name, value) {
  if (value === true) {
    return ` ${name}=""`;
  }
  return "";
}

// src/renderer/attribute-processing/get-attribute-alias.ts
var aliases = /* @__PURE__ */ new Map([
  ["acceptCharset", "accept-charset"],
  ["htmlFor", "for"],
  ["httpEquiv", "http-equiv"],
  // HTML and SVG attributes, but the SVG attribute is case sensitive.],
  ["crossOrigin", "crossorigin"],
  // This is a list of all SVG attributes that need special casing.
  // Regular attributes that just accept strings.],
  ["accentHeight", "accent-height"],
  ["alignmentBaseline", "alignment-baseline"],
  ["arabicForm", "arabic-form"],
  ["baselineShift", "baseline-shift"],
  ["capHeight", "cap-height"],
  ["clipPath", "clip-path"],
  ["clipRule", "clip-rule"],
  ["colorInterpolation", "color-interpolation"],
  ["colorInterpolationFilters", "color-interpolation-filters"],
  ["colorProfile", "color-profile"],
  ["colorRendering", "color-rendering"],
  ["dominantBaseline", "dominant-baseline"],
  ["enableBackground", "enable-background"],
  ["fillOpacity", "fill-opacity"],
  ["fillRule", "fill-rule"],
  ["floodColor", "flood-color"],
  ["floodOpacity", "flood-opacity"],
  ["fontFamily", "font-family"],
  ["fontSize", "font-size"],
  ["fontSizeAdjust", "font-size-adjust"],
  ["fontStretch", "font-stretch"],
  ["fontStyle", "font-style"],
  ["fontVariant", "font-variant"],
  ["fontWeight", "font-weight"],
  ["glyphName", "glyph-name"],
  ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
  ["glyphOrientationVertical", "glyph-orientation-vertical"],
  ["horizAdvX", "horiz-adv-x"],
  ["horizOriginX", "horiz-origin-x"],
  ["imageRendering", "image-rendering"],
  ["letterSpacing", "letter-spacing"],
  ["lightingColor", "lighting-color"],
  ["markerEnd", "marker-end"],
  ["markerMid", "marker-mid"],
  ["markerStart", "marker-start"],
  ["overlinePosition", "overline-position"],
  ["overlineThickness", "overline-thickness"],
  ["paintOrder", "paint-order"],
  ["panose-1", "panose-1"],
  ["pointerEvents", "pointer-events"],
  ["renderingIntent", "rendering-intent"],
  ["shapeRendering", "shape-rendering"],
  ["stopColor", "stop-color"],
  ["stopOpacity", "stop-opacity"],
  ["strikethroughPosition", "strikethrough-position"],
  ["strikethroughThickness", "strikethrough-thickness"],
  ["strokeDasharray", "stroke-dasharray"],
  ["strokeDashoffset", "stroke-dashoffset"],
  ["strokeLinecap", "stroke-linecap"],
  ["strokeLinejoin", "stroke-linejoin"],
  ["strokeMiterlimit", "stroke-miterlimit"],
  ["strokeOpacity", "stroke-opacity"],
  ["strokeWidth", "stroke-width"],
  ["textAnchor", "text-anchor"],
  ["textDecoration", "text-decoration"],
  ["textRendering", "text-rendering"],
  ["transformOrigin", "transform-origin"],
  ["underlinePosition", "underline-position"],
  ["underlineThickness", "underline-thickness"],
  ["unicodeBidi", "unicode-bidi"],
  ["unicodeRange", "unicode-range"],
  ["unitsPerEm", "units-per-em"],
  ["vAlphabetic", "v-alphabetic"],
  ["vHanging", "v-hanging"],
  ["vIdeographic", "v-ideographic"],
  ["vMathematical", "v-mathematical"],
  ["vectorEffect", "vector-effect"],
  ["vertAdvY", "vert-adv-y"],
  ["vertOriginX", "vert-origin-x"],
  ["vertOriginY", "vert-origin-y"],
  ["wordSpacing", "word-spacing"],
  ["writingMode", "writing-mode"],
  ["xmlnsXlink", "xmlns:xlink"],
  ["xHeight", "x-height"]
]);
function getAttributeAlias(name) {
  return aliases.get(name) || name;
}

// src/renderer/attribute-processing/is-attribute-name-safe.ts
var ATTRIBUTE_NAME_START_CHAR = ":A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
var ATTRIBUTE_NAME_CHAR = ATTRIBUTE_NAME_START_CHAR + "\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
var VALID_ATTRIBUTE_NAME_REGEX = new RegExp(
  "^[" + ATTRIBUTE_NAME_START_CHAR + "][" + ATTRIBUTE_NAME_CHAR + "]*$"
);
var illegalAttributeNameCache = {};
var validatedAttributeNameCache = {};
function isAttributeNameSafe(attributeName) {
  if (Object.hasOwn(validatedAttributeNameCache, attributeName)) {
    return true;
  }
  if (Object.hasOwn(illegalAttributeNameCache, attributeName)) {
    return false;
  }
  if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {
    validatedAttributeNameCache[attributeName] = true;
    return true;
  }
  illegalAttributeNameCache[attributeName] = true;
  console.error("Invalid attribute name: `%s`", attributeName);
  return false;
}

// src/renderer/attribute-processing/string-prop-to-html-attribute.ts
function stringPropToHtmlAttribute(name, value) {
  if (typeof value !== "function" && typeof value !== "symbol" && typeof value !== "boolean") {
    return ` ${name}="${escapeTextForBrowser(value)}"`;
  }
  return "";
}

// src/renderer/attribute-processing/style/is-unitless-number.ts
var unitlessNumbers = /* @__PURE__ */ new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "boxFlex",
  "boxFlexGroup",
  "boxOrdinalGroup",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexPositive",
  "flexShrink",
  "flexNegative",
  "flexOrder",
  "gridArea",
  "gridRow",
  "gridRowEnd",
  "gridRowSpan",
  "gridRowStart",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnSpan",
  "gridColumnStart",
  "fontWeight",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  "fillOpacity",
  // SVG-related properties
  "floodOpacity",
  "stopOpacity",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
  "MozAnimationIterationCount",
  // Known Prefixed Properties
  "MozBoxFlex",
  // TODO: Remove these since they shouldn't be used in modern code
  "MozBoxFlexGroup",
  "MozLineClamp",
  "msAnimationIterationCount",
  "msFlex",
  "msZoom",
  "msFlexGrow",
  "msFlexNegative",
  "msFlexOrder",
  "msFlexPositive",
  "msFlexShrink",
  "msGridColumn",
  "msGridColumnSpan",
  "msGridRow",
  "msGridRowSpan",
  "WebkitAnimationIterationCount",
  "WebkitBoxFlex",
  "WebKitBoxFlexGroup",
  "WebkitBoxOrdinalGroup",
  "WebkitColumnCount",
  "WebkitColumns",
  "WebkitFlex",
  "WebkitFlexGrow",
  "WebkitFlexPositive",
  "WebkitFlexShrink",
  "WebkitLineClamp"
]);
function isUnitlessNumber(name) {
  return unitlessNumbers.has(name);
}

// src/renderer/attribute-processing/style/hyphenate-style-name.ts
var uppercasePattern = /([A-Z])/g;
var msPattern = /^ms-/;
function hyphenateStyleName(name) {
  return name.replace(uppercasePattern, "-$1").toLowerCase().replace(msPattern, "-ms-");
}

// src/renderer/attribute-processing/style/process-style-name.ts
var styleNameCache = /* @__PURE__ */ new Map();
function processStyleName(styleName) {
  if (!styleNameCache.has(styleName)) {
    styleNameCache.set(styleName, hyphenateStyleName(styleName));
  }
  return styleNameCache.get(styleName);
}

// src/renderer/attribute-processing/style-prop-to-html-attribute.ts
function stylePropToHtmlAttribute(style) {
  if (typeof style !== "object") {
    throw new Error(
      "The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX."
    );
  }
  let styles = [];
  for (const [styleName, styleValue] of Object.entries(style)) {
    if (styleValue == null || typeof styleValue === "boolean" || styleValue === "") {
      continue;
    }
    let nameChunk;
    let valueChunk;
    const isCustomProperty = styleName.indexOf("--") === 0;
    if (isCustomProperty) {
      nameChunk = styleName;
      valueChunk = ("" + styleValue).trim();
    } else {
      nameChunk = processStyleName(styleName);
      if (typeof styleValue === "number") {
        if (styleValue !== 0 && !isUnitlessNumber(styleName)) {
          valueChunk = styleValue + "px";
        } else {
          valueChunk = "" + styleValue;
        }
      } else {
        valueChunk = ("" + styleValue).trim();
      }
    }
    styles.push(`${nameChunk}:${valueChunk}`);
  }
  return ` style="${styles.join(";").replaceAll('"', "'")}"`;
}

// src/renderer/attribute-processing/prop-to-html-attribute.ts
function propToHtmlAttribute(name, value) {
  if (value === void 0)
    return "";
  switch (name) {
    case "className": {
      return stringPropToHtmlAttribute("class", value);
    }
    case "tabIndex": {
      return stringPropToHtmlAttribute("tabindex", value);
    }
    case "dir":
    case "role":
    case "viewBox":
    case "width":
    case "height": {
      return stringPropToHtmlAttribute(name, value);
    }
    case "style": {
      return stylePropToHtmlAttribute(value);
    }
    case "defaultValue":
    case "defaultChecked":
    case "innerHTML":
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "ref":
      return "";
    case "autoFocus":
    case "multiple":
    case "muted": {
      return booleanPropToHtmlAttribute(name, value);
    }
    case "xlinkHref": {
      if (typeof value === "function" || typeof value === "symbol" || typeof value === "boolean") {
        return "";
      }
      return ` xlink:href="${escapeTextForBrowser(value)}"`;
    }
    case "contentEditable":
    case "spellCheck":
    case "draggable":
    case "value":
    case "autoReverse":
    case "externalResourcesRequired":
    case "focusable":
    case "preserveAlpha": {
      if (typeof value !== "function" && typeof value !== "symbol") {
        return ` ${name}="${escapeTextForBrowser(value)}"`;
      }
      return "";
    }
    case "allowFullScreen":
    case "async":
    case "autoPlay":
    case "controls":
    case "default":
    case "defer":
    case "disabled":
    case "disablePictureInPicture":
    case "disableRemotePlayback":
    case "formNoValidate":
    case "hidden":
    case "loop":
    case "noModule":
    case "noValidate":
    case "open":
    case "playsInline":
    case "readOnly":
    case "required":
    case "reversed":
    case "scoped":
    case "seamless":
    case "itemScope": {
      if (value && typeof value !== "function" && typeof value !== "symbol") {
        return ` ${name}=""`;
      }
      return "";
    }
    case "capture":
    case "download": {
      if (value === true) {
        return ` ${name}=""`;
      } else if (value === false) {
      } else if (typeof value !== "function" && typeof value !== "symbol") {
        return ` ${name}="${escapeTextForBrowser(value)}"`;
      }
      return "";
    }
    case "cols":
    case "rows":
    case "size":
    case "span": {
      if (typeof value !== "function" && typeof value !== "symbol" && !isNaN(value) && value >= 1) {
        return ` ${name}="${escapeTextForBrowser(value)}"`;
      }
      return "";
    }
    case "rowSpan":
    case "start": {
      if (typeof value !== "function" && typeof value !== "symbol" && !isNaN(value)) {
        return ` ${name}="${escapeTextForBrowser(value)}"`;
      }
      return "";
    }
    case "xlinkActuate":
      return stringPropToHtmlAttribute("xlink:actuate", escapeTextForBrowser(value));
    case "xlinkArcrole":
      return stringPropToHtmlAttribute("xlink:arcrole", escapeTextForBrowser(value));
    case "xlinkRole":
      return stringPropToHtmlAttribute("xlink:role", escapeTextForBrowser(value));
    case "xlinkShow":
      return stringPropToHtmlAttribute("xlink:show", escapeTextForBrowser(value));
    case "xlinkTitle":
      return stringPropToHtmlAttribute("xlink:title", escapeTextForBrowser(value));
    case "xlinkType":
      return stringPropToHtmlAttribute("xlink:type", escapeTextForBrowser(value));
    case "xmlBase":
      return stringPropToHtmlAttribute("xml:base", escapeTextForBrowser(value));
    case "xmlLang":
      return stringPropToHtmlAttribute("xml:lang", escapeTextForBrowser(value));
    case "xmlSpace":
      return stringPropToHtmlAttribute("xml:space", escapeTextForBrowser(value));
    default:
      if (
        // shouldIgnoreAttribute
        // We have already filtered out null/undefined and reserved words.
        name.length > 2 && (name[0] === "o" || name[0] === "O") && (name[1] === "n" || name[1] === "N")
      ) {
        return "";
      }
      const attributeName = getAttributeAlias(name);
      if (isAttributeNameSafe(attributeName)) {
        switch (typeof value) {
          case "function":
          case "symbol":
            return "";
          case "boolean": {
            const prefix = attributeName.toLowerCase().slice(0, 5);
            if (prefix !== "data-" && prefix !== "aria-") {
              return "";
            }
          }
        }
        return ` ${name}="${escapeTextForBrowser(value)}"`;
      }
  }
  return "";
}

// src/renderer/renderer.tsx
var Destination = class {
  constructor() {
    this.html = "";
    this.decoder = new TextDecoder("utf8", {
      fatal: true
    });
    this.listeners = [];
  }
  write(content) {
    this.html += content;
  }
  writeEncoded(buffer) {
    this.html += this.decoder.decode(buffer, { stream: true });
  }
  promise() {
    return new Promise((resolve, reject) => {
      this.listeners.push([resolve, reject]);
    });
  }
  completeWithError(error) {
    this.listeners.forEach(([_, reject]) => reject(error));
  }
  complete() {
    this.listeners.forEach(([resolve]) => resolve(this.html));
  }
};
var encoder = new TextEncoder();
var Renderer = ReactServer({
  scheduleMicrotask(callback) {
    queueMicrotask(() => callback());
  },
  scheduleWork(callback) {
    setTimeout(() => {
      callback();
    });
  },
  beginWriting(destination) {
  },
  writeChunk(destination, buffer) {
    destination.writeEncoded(buffer);
  },
  writeChunkAndReturn(destination, buffer) {
    destination.writeEncoded(buffer);
    return true;
  },
  completeWriting(destination) {
  },
  close(destination) {
    destination.complete();
  },
  closeWithError(destination, error) {
    destination.completeWithError(error);
  },
  flushBuffered(destination) {
  },
  getChildFormatContext() {
    return null;
  },
  resetResumableState() {
  },
  completeResumableState() {
  },
  pushTextInstance(target, text, renderState, textEmbedded) {
    target.push(encoder.encode(escapeTextForBrowser(text)));
    return true;
  },
  pushStartInstance(target, type, props) {
    target.push(encoder.encode(`<${type}`));
    let dangerouslySetInnerHTML = void 0;
    let children = void 0;
    for (const [name, value] of Object.entries(props)) {
      if (name === "children") {
        children = value;
        continue;
      } else if (name === "dangerouslySetInnerHTML") {
        dangerouslySetInnerHTML = value;
        continue;
      }
      target.push(encoder.encode(propToHtmlAttribute(name, value)));
    }
    target.push(encoder.encode(">"));
    if (dangerouslySetInnerHTML !== void 0) {
      if (children !== void 0) {
        throw new Error(
          "Can only set one of `children` or `props.dangerouslySetInnerHTML`."
        );
      }
      if (typeof dangerouslySetInnerHTML !== "object" || !("__html" in dangerouslySetInnerHTML)) {
        throw new Error(
          "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information."
        );
      }
      const html2 = dangerouslySetInnerHTML.__html;
      if (html2 !== null && html2 !== void 0) {
        target.push(encoder.encode("" + html2));
      }
    }
    if (typeof children === "string" || typeof children === "number" || typeof children === "boolean" || typeof children === "bigint") {
      target.push(encoder.encode(escapeTextForBrowser("" + children)));
      return null;
    }
    return children;
  },
  pushEndInstance(target, type) {
    switch (type) {
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "img":
      case "input":
      case "keygen":
      case "link":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr": {
        return;
      }
    }
    target.push(encoder.encode(`</${type}>`));
  },
  pushSegmentFinale(target, _, lastPushedText, textEmbedded) {
  },
  writeCompletedRoot() {
    return true;
  },
  writePlaceholder() {
    return true;
  },
  writeStartCompletedSuspenseBoundary() {
    return true;
  },
  writeStartPendingSuspenseBoundary() {
    return true;
  },
  writeStartClientRenderedSuspenseBoundary() {
    return true;
  },
  writeEndCompletedSuspenseBoundary(destination) {
    return true;
  },
  writeEndPendingSuspenseBoundary(destination) {
    return true;
  },
  writeEndClientRenderedSuspenseBoundary(destination) {
    return true;
  },
  writeStartSegment(destination, renderState, formatContext, id) {
    return true;
  },
  writeEndSegment(destination, formatContext) {
    return true;
  },
  writeCompletedSegmentInstruction(destination, renderState, contentSegmentID) {
    return true;
  },
  writeCompletedBoundaryInstruction() {
    return true;
  },
  writeClientRenderBoundaryInstruction() {
    return true;
  },
  writePreamble(destination) {
    destination.write(
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'
    );
  },
  writeHoistables() {
  },
  writeHoistablesForBoundary() {
  },
  writePostamble() {
  },
  hoistHoistables(parent, child) {
  },
  createHoistableState() {
    return null;
  },
  emitEarlyPreloads() {
  }
});

// src/render.tsx
var render = (element, options) => __async(void 0, null, function* () {
  const destination = new Destination();
  const request = Renderer.createRequest(element, null, null, null, void 0);
  Renderer.startWork(request);
  Renderer.startFlowing(request, destination);
  const html2 = yield destination.promise();
  if (options == null ? void 0 : options.plainText) {
    return convert(html2, __spreadValues({
      selectors: plainTextSelectors
    }, options.htmlToTextOptions));
  }
  if (options == null ? void 0 : options.pretty) {
    return pretty(html2);
  }
  return html2;
});
export {
  pretty,
  render
};
