interface Person {
  name: string
  availability: Array<{
    time: string
    level: string // "preferred", "can_if_needed", "not_available"
  }>
}

interface Availability {
  date: string
  /** Names of everyone who is available at this date */
  people: string[]
  /** Names of people who prefer this time */
  preferred: string[]
  /** Names of people who can do this time if needed */
  canIfNeeded: string[]
}

interface AvailabilityInfo {
  availabilities: Availability[]
  min: number
  max: number
}

/**
 * Takes an array of dates and an array of people,
 * where each person has a name and availability array, and returns the
 * group availability for each date passed in.
 */
export const calculateAvailability = (dates: string[], people: Person[]): AvailabilityInfo => {
  let min = people.length // Start with max possible value
  let max = 0 // Start with min possible value

  const availabilities: Availability[] = dates.map(date => {
    const preferred: string[] = []
    const canIfNeeded: string[] = []
    const available: string[] = []

    people.forEach(person => {
      const timeAvailability = person.availability.find(a => a.time === date)
      if (timeAvailability) {
        switch (timeAvailability.level) {
          case 'preferred':
            preferred.push(person.name)
            available.push(person.name)
            break
          case 'can_if_needed':
            canIfNeeded.push(person.name)
            available.push(person.name)
            break
          case 'not_available':
          default:
            // Not available, don't add to any list
            break
        }
      }
    })

    if (available.length < min) {
      min = available.length
    }
    if (available.length > max) {
      max = available.length
    }

    return { 
      date, 
      people: available,
      preferred,
      canIfNeeded
    }
  })

  // If no one is available at any time, set min to 0
  if (max === 0) {
    min = 0
  }

  return { availabilities, min, max }
}
