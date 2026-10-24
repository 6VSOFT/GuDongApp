import { cloneElement, isValidElement } from "react";
import * as OpenCC from "opencc-js/cn2t";

const traditional = OpenCC.Converter({ from: "cn", to: "tw" });
const cache = new Map();
export function displayText(text, language) {
  if (language !== "zh-Hant" || typeof text !== "string") return text;
  if (!cache.has(text)) {
    if (cache.size >= 2000) cache.clear();
    cache.set(text, traditional(text));
  }
  return cache.get(text);
}

// Translate display text during React rendering. Values, IDs and event handlers
// stay untouched so language selection cannot change game state or form input.
export function localizeTree(node, language) {
  if (typeof node === "string") return displayText(node, language);
  if (Array.isArray(node))
    return node.map((child) => localizeTree(child, language));
  if (!isValidElement(node) || node.props.translate === "no") return node;
  const props = {};
  for (const key of ["title", "aria-label", "placeholder", "alt"])
    if (typeof node.props[key] === "string")
      props[key] = displayText(node.props[key], language);
  if (node.props.children !== undefined)
    props.children = localizeTree(node.props.children, language);
  return cloneElement(node, props);
}
