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

const flattenArrays = (acc, curr) => {
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
const getIncludedSlots = (eventList, period) => {
    return eventList.filter((event) => {
        if (period.contains(event.startDate) || period.contains(event.endDate)) {
            return true
        }
        return false
    })
}

const generateAnswer = (rangedSlots) => {
    const orderedAvailableSlot = rangedSlots.filter(slot => slot.opening).sort(o => o.moment(slot.startDate).unix())
    const orderedUnAvailableSlot = rangedSlots.filter(slot => !slot.opening).sort(o => o.moment(slot.startDate).unix())
    const orderedAvailableNormalizedSlot = orderedAvailableSlot.map(slot => {
        return Array.from(moment.range(slot.startDate, slot.endDate).byRange(moment.range(moment(), moment().add(30, 'minute')), { excludeEnd: true })).map(x => {
            return moment.range(x, moment(x).add(30, 'minute'))
        }
        )
    }
    ).reduce(flattenArrays, [])
    const orderedUnAvailableNormalizedSlot = orderedUnAvailableSlot.map(slot => {
        return Array.from(moment.range(slot.startDate, slot.endDate).byRange(moment.range(moment(), moment().add(30, 'minute')), { excludeEnd: true })).map(x => {
            return moment.range(x, moment(x).add(30, 'minute'))
        }
        )
    }
    ).reduce(flattenArrays, [])
    const slotsMatch = orderedAvailableNormalizedSlot.filter(av => {
        let shouldStay = true
        orderedUnAvailableNormalizedSlot.forEach(unav => {
            if (unav.intersect(av)) {
                debugger
                shouldStay = false
            }
        })
        return shouldStay
    })
    return slotsMatch
}

Event.prototype.getAvailabilities = (fromDate, toDate) => {
    const simpleEventList = getSimpleEventList(fromDate, toDate)
    const period = moment.range(fromDate, toDate)
    const rangedSlots = getIncludedSlots(simpleEventList, period)
    return generateAnswer(rangedSlots)
}

module.exports = Event
