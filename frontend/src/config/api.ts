// TODO: Potentially write a simple rust crate that generates these from the OpenAPI spec

import { z } from 'zod'

const EventInput = z.object({
  name: z.string().optional(),
  times: z.string().array(),
  timezone: z.string(),
})

export type EventInput = z.infer<typeof EventInput>

const EventResponse = z.object({
  id: z.string(),
  name: z.string(),
  times: z.string().array(),
  timezone: z.string(),
  created_at: z.number(),
})
export type EventResponse = z.infer<typeof EventResponse>

const AvailabilityLevelResponse = z.object({
  time: z.string(),
  level: z.string(), // "preferred", "can_if_needed", "not_available"
})
export type AvailabilityLevelResponse = z.infer<typeof AvailabilityLevelResponse>

const PersonInput = z.object({
  availability: AvailabilityLevelResponse.array(),
})

export type PersonInput = z.infer<typeof PersonInput>

const PersonResponse = z.object({
  name: z.string(),
  availability: AvailabilityLevelResponse.array(),
  created_at: z.number(),
})
export type PersonResponse = z.infer<typeof PersonResponse>

const StatsResponse = z.object({
  event_count: z.number(),
  person_count: z.number(),
  version: z.string(),
})
export type StatsResponse = z.infer<typeof StatsResponse>

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3034'

async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { headers, ...restOptions } = options ?? {}
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function createEvent(input: EventInput): Promise<EventResponse> {
  return apiCall<EventResponse>('/event', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getEvent(id: string): Promise<EventResponse> {
  return apiCall<EventResponse>(`/event/${id}`)
}

export async function getPeople(eventId: string): Promise<PersonResponse[]> {
  return apiCall<PersonResponse[]>(`/event/${eventId}/people`)
}

export async function getPerson(eventId: string, name: string, password?: string): Promise<PersonResponse> {
  const headers: Record<string, string> = {}
  if (password) {
    headers.Authorization = `Bearer ${btoa(password)}`
  }

  return apiCall<PersonResponse>(`/event/${eventId}/people/${encodeURIComponent(name)}`, {
    headers,
  })
}

export async function updatePerson(eventId: string, name: string, input: PersonInput, password?: string): Promise<PersonResponse> {
  const options: RequestInit = {
    method: 'PATCH',
    body: JSON.stringify(input),
  }
  
  if (password) {
    options.headers = {
      Authorization: `Bearer ${btoa(password)}`
    }
  }

  return apiCall<PersonResponse>(`/event/${eventId}/people/${encodeURIComponent(name)}`, options)
}

export async function getStats(): Promise<StatsResponse> {
  return apiCall<StatsResponse>('/stats')
}
