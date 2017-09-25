// @flow

import deepEqual from 'fast-deep-equal'
import { checkCondition } from 'power-filter/jsnext'
import {
  getNestedValue,
  sortByNotation,
} from 'phenyl-utils/jsnext'

import type {
  AddToSetOperator,
  BitOperator,
  CurrentDateOperator,
  DotNotationString,
  IncOperator,
  MaxOperator,
  MinOperator,
  MulOperator,
  PopOperator,
  PullOperator,
  PushModifier,
  PushOperator,
  QueryCondition,
  Restorable,
  SetOperator,
  UpdateOperators,
  WhereConditions,
} from 'phenyl-interfaces'

import { retargetToProp } from './retarget-to-prop.js'
import { getObjectsToBeAssigned } from './get-objects-to-be-assigned.js'

/**
 *
 */
export default class PowerAssign {

  /**
   *
   */
  static assign<T: Restorable>(obj: T, ops: UpdateOperators): T {
    let updatedObj: T = obj
    const operatorNames = Object.keys(ops)

    for (const operatorName of operatorNames) {
      switch (operatorName) {

        case '$inc':
          if (ops.$inc == null) break // for flowtype checking...
          updatedObj = this.$inc(updatedObj, ops.$inc)
          break

        case '$set':
          if (ops.$set == null) break // for flowtype checking...
          updatedObj = this.$set(updatedObj, ops.$set)
          break

        case '$min':
          if (ops.$min == null) break // for flowtype checking...
          updatedObj = this.$min(updatedObj, ops.$min)
          break

        case '$max':
          if (ops.$max == null) break // for flowtype checking...
          updatedObj = this.$max(updatedObj, ops.$max)
          break

        case '$mul':
          if (ops.$mul == null) break // for flowtype checking...
          updatedObj = this.$mul(updatedObj, ops.$mul)
          break

        case '$addToSet':
          if (ops.$addToSet == null) break // for flowtype checking...
          updatedObj = this.$addToSet(updatedObj, ops.$addToSet)
          break

        case '$pop':
          if (ops.$pop == null) break // for flowtype checking...
          updatedObj = this.$pop(updatedObj, ops.$pop)
          break

        case '$pull':
          if (ops.$pull == null) break // for flowtype checking...
          updatedObj = this.$pull(updatedObj, ops.$pull)
          break

        case '$push':
          if (ops.$push == null) break // for flowtype checking...
          updatedObj = this.$push(updatedObj, ops.$push)
          break

        case '$currentDate':
          if (ops.$currentDate == null) break // for flowtype checking...
          updatedObj = this.$currentDate(updatedObj, ops.$currentDate)
          break

        case '$bit':
          if (ops.$bit == null) break // for flowtype checking...
          updatedObj = this.$bit(updatedObj, ops.$bit)
          break

        case '$rename':
        case '$setOnInsert':
        case '$unset':
          throw new Error(`The given operator "${operatorName}" is not implemented yet.`)

        default:
          throw new Error(`Invalid operator: "${operatorName}"`)
      }
    }

    const Constructor = obj.constructor
    return (Constructor === Object) ? updatedObj : new Constructor(updatedObj)
  }

  /**
   *
   */
  static $set<T: Restorable>(obj: T, setOp: SetOperator): T {
    let updatedObj = obj
    Object.keys(setOp).forEach(dnStr => {
      updatedObj = this.setValue(updatedObj, dnStr, setOp[dnStr])
    })
    return updatedObj
  }


  /**
   *
   */
  static $inc<T: Restorable>(obj: T, incOp: IncOperator): T {
    const valuesToSet = {}

    Object.keys(incOp).forEach(dnStr => {
      const currentVal = getNestedValue(obj, dnStr)
      const inc = incOp[dnStr]
      valuesToSet[dnStr] = currentVal + inc
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static $min<T: Restorable>(obj: T, minOp: MinOperator): T {
    const valuesToSet = {}

    Object.keys(minOp).forEach(dnStr => {
      const currentVal = getNestedValue(obj, dnStr)
      const newVal = minOp[dnStr]
      if (newVal < currentVal) {
        valuesToSet[dnStr] = newVal
      }
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static $max<T: Restorable>(obj: T, maxOp: MaxOperator): T {
    const valuesToSet = {}

    Object.keys(maxOp).forEach(dnStr => {
      const currentVal = getNestedValue(obj, dnStr)
      const newVal = maxOp[dnStr]
      if (newVal > currentVal) {
        valuesToSet[dnStr] = newVal
      }
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static $mul<T: Restorable>(obj: T, mulOp: MulOperator): T {
    const valuesToSet = {}

    Object.keys(mulOp).forEach(dnStr => {
      const currentNum = getNestedValue(obj, dnStr)
      if (currentNum == null) {
        throw Error('operand must not be null')
      }
      valuesToSet[dnStr] = currentNum * mulOp[dnStr]
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static $addToSet<T: Restorable>(obj: T, addToSetOp: AddToSetOperator): T {
    const valuesToSet = {}

    Object.keys(addToSetOp).forEach(dnStr => {
      let arr: ?Array<any> = getNestedValue(obj, dnStr)
      if (arr == null) {
        arr = [] // If the field is absent, empty array is set.
      }
      if (!Array.isArray(arr)) {
        throw new Error(`"$addToSet" operator must be applied to an array. Dot notation: "${dnStr}".`)
      }
      let modifier = addToSetOp[dnStr]

      if (modifier.$each == null) {
        modifier = { $each: [modifier] }
      }
      // $FlowIssue(arr-is-Array)
      const newArr = modifier.$each.filter(element => !arr.some(arrEl => deepEqual(arrEl, element)))
      valuesToSet[dnStr] = arr.concat(newArr)
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static $pop<T: Restorable>(obj: T, popOp: PopOperator): T {
    const valuesToSet = {}

    Object.keys(popOp).forEach(dnStr => {
      let arr: ?Array<any> = getNestedValue(obj, dnStr).slice()
      if (arr == null) {
        arr = [] // If the field is absent, empty array is set.
      }
      if (!Array.isArray(arr)) {
        throw new Error(`"$push" operator must be applied to an array. Dot notation: "${dnStr}".`)
      }
      if (popOp[dnStr] === 1) {
        arr.pop()
      } else {
        arr.shift()
      }
      valuesToSet[dnStr] = arr
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static $pull<T: Restorable>(obj: T, pullOp: PullOperator): T {
    const valuesToSet = {}

    Object.keys(pullOp).forEach(dnStr => {
      let arr: ?Array<any> = getNestedValue(obj, dnStr)
      if (arr == null) {
        return // If the field is absent, no requests will be executed
      }
      if (!Array.isArray(arr)) {
        throw new Error(`"$pull" operator must be applied to an array. Dot notation: "${dnStr}".`)
      }
      const condition = pullOp[dnStr]
      valuesToSet[dnStr] = arr.filter(val => checkCondition(val, condition) === false)
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static $push<T: Restorable>(obj: T, pushOp: PushOperator): T {
    const valuesToSet = {}

    Object.keys(pushOp).forEach(dnStr => {
      let arr: ?Array<any> = getNestedValue(obj, dnStr)
      if (arr == null) {
        arr = [] // If the field is absent, empty array is set.
      }
      if (!Array.isArray(arr)) {
        throw new Error(`"$push" operator must be applied to an array. Dot notation: "${dnStr}".`)
      }
      let modifier: PushModifier = pushOp[dnStr]

      // Is type of newVal PushModifier or just the value?
      if (modifier.$each == null) {
        modifier = { $each: [modifier] }
      }

      let position = (modifier.$position != null) ? modifier.$position : arr.length
      let newArr = arr.slice()
      newArr.splice(position, 0, ...modifier.$each)
      if (modifier.$sort != null) {
        newArr = sortByNotation(newArr, modifier.$sort)
      }
      if (modifier.$slice != null) {
        newArr = newArr.slice(0, modifier.$slice)
      }
      valuesToSet[dnStr] = newArr
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static $currentDate<T: Restorable>(obj: T, curDateOp: CurrentDateOperator): T {
    const valuesToSet = {}

    Object.keys(curDateOp).forEach(dnStr => {
      let typeSpecification = curDateOp[dnStr]

      if (typeSpecification === true) {
        typeSpecification = { $type: 'date'}
      }
      const now = new Date()
      valuesToSet[dnStr] = typeSpecification.$type === 'date' ? now : now.getTime()
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static $bit<T: Restorable>(obj: T, bitOp: BitOperator): T {
    const valuesToSet = {}

    Object.keys(bitOp).forEach(dnStr => {
      const currentNum = getNestedValue(obj, dnStr) || 0 // If the field is absent, 0 is set.
      const logicalOperator = Object.keys(bitOp[dnStr])[0]
      // $FlowIssue(return-number)
      const operand: number = bitOp[dnStr][logicalOperator]
      switch (logicalOperator) {
        case 'and':
          valuesToSet[dnStr] = currentNum & operand
          break
        case 'or':
          valuesToSet[dnStr] = currentNum | operand
          break
        case 'xor':
          valuesToSet[dnStr] = currentNum ^ operand
          break
      }
    })
    return this.$set(obj, valuesToSet)
  }

  /**
   *
   */
  static setValue<T: Restorable>(obj: T, dnStr: DotNotationString, value: any): T {
    const revObjsToBeAssigned = getObjectsToBeAssigned(obj, dnStr).reverse()
    const revKeys = dnStr.split('.').reverse()
    // assert(objsToBeAssigned.length === keys.length)
    // $FlowIssue(return-T)
    return revKeys.reduce((newValue, key, i) =>
      // $FlowIssue(reduce-first-argument-type)
      Object.assign({}, revObjsToBeAssigned[i], { [key]: newValue })
    , value)
  }
}

/**
 *
 */
export function assign<T: Restorable>(obj: T, ops: UpdateOperators): T {
  return PowerAssign.assign(obj, ops)
}

export function assignToProp<T: Restorable>(obj: T, propName: DotNotationString, ops: UpdateOperators): T {
  const modifiedOps = retargetToProp(ops, propName)
  return assign(obj, modifiedOps)
}