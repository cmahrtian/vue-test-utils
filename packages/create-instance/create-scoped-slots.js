// @flow

import Vue from 'vue'
import { compileToFunctions } from 'vue-template-compiler'
import { throwError, vueVersion } from 'shared/util'

function isDestructuringSlotScope (slotScope: string): boolean {
  return slotScope[0] === '{' && slotScope[slotScope.length - 1] === '}'
}

function getVueTemplateCompilerHelpers (): { [name: string]: Function } {
  const vue = new Vue()
  const helpers = {}
  const names = [
    '_c',
    '_o',
    '_n',
    '_s',
    '_l',
    '_t',
    '_q',
    '_i',
    '_m',
    '_f',
    '_k',
    '_b',
    '_v',
    '_e',
    '_u',
    '_g'
  ]
  names.forEach(name => {
    helpers[name] = vue._renderProxy[name]
  })
  helpers.$createElement = vue._renderProxy.$createElement
  return helpers
}

function validateEnvironment (): void {
  if (vueVersion < 2.1) {
    throwError(`the scopedSlots option is only supported in vue@2.1+.`)
  }
}

const slotScopeRe = /<[^>]+ slot-scope=\"(.+)\"/

// Hide warning about <template> disallowed as root element
function customWarn (msg) {
  if (msg.indexOf('Cannot use <template> as component root element') === -1) {
    console.error(msg)
  }
}

export default function createScopedSlots (
  scopedSlotsOption: ?{ [slotName: string]: string | Function }
): {
  [slotName: string]: (props: Object) => VNode | Array<VNode>
} {
  const scopedSlots = {}
  if (!scopedSlotsOption) {
    return scopedSlots
  }
  validateEnvironment()
  const helpers = getVueTemplateCompilerHelpers()
  for (const scopedSlotName in scopedSlotsOption) {
    const slot = scopedSlotsOption[scopedSlotName]
    const isFn = typeof slot === 'function'
    // Type check to silence flow (can't use isFn)
    const renderFn = typeof slot === 'function'
      ? slot
      : compileToFunctions(slot, { warn: customWarn }).render

    const hasSlotScopeAttr = !isFn && slot.match(slotScopeRe)
    const slotScope = hasSlotScopeAttr && hasSlotScopeAttr[1]
    scopedSlots[scopedSlotName] = function (props) {
      let res
      if (isFn) {
        res = renderFn.call({ ...helpers }, props)
      } else if (slotScope && !isDestructuringSlotScope(slotScope)) {
        res = renderFn.call({ ...helpers, [slotScope]: props })
      } else if (slotScope && isDestructuringSlotScope(slotScope)) {
        res = renderFn.call({ ...helpers, ...props })
      } else {
        res = renderFn.call({ ...helpers, props })
      }
      // res is Array if <template> is a root element
      return Array.isArray(res) ? res[0] : res
    }
  }
  return scopedSlots
}
