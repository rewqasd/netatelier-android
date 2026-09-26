import { describe, it, expect } from 'vitest'
import { validateProject } from '../../src/domain/schema'
import { minimalProject } from '../helpers/projects'

describe('project boundary validation', () => {
  it('accepts and copies a finite metric project without mutating the input', () => {
    const source = minimalProject()
    const result = validateProject(source)
    expect(result.issues).toEqual([])
    expect(result.project).toEqual(source)
    expect(result.project).not.toBe(source)
  })
  it.each([undefined, null, [], {}, {schemaVersion:999}])('rejects missing or unknown schema', value => {
    expect(validateProject(value).project).toBeUndefined()
    expect(validateProject(value).issues.some(i => i.severity === 'blocking')).toBe(true)
  })
  it.each([NaN, Infinity, -Infinity])('rejects non-finite physical coordinates', value => {
    const p = minimalProject(); p.floors[0].boundary[0].x = value
    expect(validateProject(p).project).toBeUndefined()
  })
  it('rejects duplicate entity IDs and dangling cable endpoint references', () => {
    const p = minimalProject()
    p.floors.push({...p.floors[0]})
    expect(validateProject(p).project).toBeUndefined()
    const q:any = minimalProject()
    q.floors[0].cables.push({id:'wire1',floorId:'f1',fromId:'missing-cabinet',toId:'missing-ap',pointsM:[{x:1,y:1},{x:2,y:2}],status:'confirmed',locked:false})
    expect(validateProject(q).project).toBeUndefined()
  })
  it('rejects a device referring to an absent floor and incompatible radio fields', () => {
    const p:any = minimalProject()
    p.floors[0].devices.push({id:'d1',floorId:'f2',kind:'ap',label:'AP1',positionM:{x:2,y:2},locked:false,source:'automatic',wifi:6,mount:'ceiling'})
    expect(validateProject(p).project).toBeUndefined()
    p.floors[0].devices[0].floorId = 'f1'; p.floors[0].devices[0].wifi = 99
    expect(validateProject(p).project).toBeUndefined()
    p.floors[0].devices[0].wifi = 6; p.floors[0].devices[0].kind = 'camera'
    expect(validateProject(p).project).toBeUndefined()
  })
  it('rejects invalid quantities, negative or fractional money and unsafe asset references', () => {
    const p:any = minimalProject(); p.floors[0].demand.wiredPoints = -1
    expect(validateProject(p).project).toBeUndefined()
    const q:any = minimalProject(); q.priceOverrides.ap = 0.5
    expect(validateProject(q).project).toBeUndefined()
    q.priceOverrides.ap = -5
    expect(validateProject(q).project).toBeUndefined()
    const r:any = minimalProject(); r.floors[0].document = {assetId:'../../secret',mime:'image/png',widthPx:1000,heightPx:1000,page:0}
    expect(validateProject(r).project).toBeUndefined()
  })
  it('allows free adopted prices but rejects extra undocumented properties', () => {
    const p:any = minimalProject(); p.priceOverrides.ap = 0
    expect(validateProject(p).project).toBeDefined()
    p.remoteServer = 'https://unapproved.example'
    expect(validateProject(p).project).toBeUndefined()
  })
})
