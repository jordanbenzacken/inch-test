const Moment = require('moment')
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);

const eventList = []

const Event = function(opening, recurring, startDate, endDate) {
    this.opening = opening
    this.recurring = recurring
    this.startDate = startDate

    //Normalize, if no endDate, finish in one hour by convention
    this.endDate = endDate ? endDate : moment(startDate).add(1, 'hour')

    eventList.push(this)
}

//Generate a list with no recurring slots
const getSimpleSlots = (event, fromDate, toDate) => {
    const numberOfWeeks = moment(toDate).diff(moment(fromDate), 'week') + 1
    if (event.startDate > toDate) {
        //No need to go deeper
        return null
    }
    if (!event.recurring) {
        return event
    }

    //if recurring, generate simple slots
    const offSet = moment(fromDate).diff(moment(event.startDate), 'week') + 1
    const events = Array.from(new Array(numberOfWeeks), (val, index) => ({
        opening: event.opening,
        recurring: false,
        startDate: dateWeeksAdded(event.startDate, index + offSet),
        endDate: dateWeeksAdded(event.endDate, index + offSet)
    }))
    return events
}

//map reduce to have array of simple events
const getSimpleEventList = (fromDate, toDate) => {
    return eventList.map((event) => getSimpleSlots(event, fromDate, toDate)).reduce(flattenArrays, [])
}

const flattenArrays = (acc = [], curr) => {
    let res = acc
    if (curr.length) {
        res = acc.concat(curr)
    } else if (curr) {
        res.push(curr)
    }
    return res
}

const dateWeeksAdded = (date, numberOfWeeks) => {
    return moment(date).add(numberOfWeeks, 'week')
}

//Filter to get only slots included in this period
const getIncludedSlots = (eventList = [], period = {}) => {
    return eventList.filter((event) => {
        if (period.contains(event.startDate) || period.contains(event.endDate)) {
            return true
        }
        return false
    })
}

//this slice unit can be easily change (30 minutes, 15min, 2 hours slots ...)
const sliceRange = (slot = {}, duration = 30, unit = 'minute') => {
    return Array.from(moment.range(slot.startDate, slot.endDate).byRange(moment.range(moment(), moment().add(duration, unit)), { excludeEnd: true })).map(x => {
        return moment.range(x, moment(x).add(duration, unit))
    }
    )
}

const computeIntersects = (rangedSlots = []) => {
    const availableSlot = rangedSlots.filter(slot => slot.opening)
    const unAvailableSlot = rangedSlots.filter(slot => !slot.opening)
    const availableSlicedSlot = availableSlot.map((slot) => sliceRange(slot)).reduce(flattenArrays, [])
    const unAvailableSlicedSlot = unAvailableSlot.map((slot) => sliceRange(slot)).reduce(flattenArrays, [])
    const slotsMatch = availableSlicedSlot.filter(av => {
        let shouldStay = true
        unAvailableSlicedSlot.forEach(unav => {
            if (unav.intersect(av)) {
                shouldStay = false
            }
        })
        return shouldStay
    })
    return slotsMatch
}

const computeAnswer = (ranges = []) => {
    return ranges.sort(r => -r.start).reduce((acc, curr) => {
        return `${acc}, the ${curr.start.format('Do dddd MMM, HH:mm')}`
    }, 'My friend, I promise I can be HERE')
}

Event.prototype.getAvailabilities = (fromDate, toDate) => {
    const simpleEventList = getSimpleEventList(fromDate, toDate)
    const rangedSlots = getIncludedSlots(simpleEventList, moment.range(fromDate, toDate))
    const intersects = computeIntersects(rangedSlots)
    return computeAnswer(intersects)
}

module.exports = Event
