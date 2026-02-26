import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const CF_ACCOUNT_ID = '91ddd4ffd23fb9da94bb8c2a99225a3f'
const CF_SITE_TAG = '55503cb624cd432ab85d4d7f8cef5261'
const CF_GQL = 'https://api.cloudflare.com/client/v4/graphql'

function getToken(request: NextRequest): string {
  // @ts-expect-error - Cloudflare context
  const env = (request as any).env || (globalThis as any).env || {}
  return env.CF_API_TOKEN || process.env.CF_API_TOKEN || ''
}

async function gql(token: string, query: string) {
  const res = await fetch(CF_GQL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return res.json()
}

function acct(obj: any) {
  return obj?.data?.viewer?.accounts?.[0] || {}
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'CF_API_TOKEN not configured', hasData: false },
        { status: 500 }
      )
    }

    const today = new Date().toISOString().slice(0, 10)
    const start30d = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const start7d = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

    const filter30d = `AND: [{datetime_geq: "${start30d}T00:00:00Z", datetime_leq: "${today}T23:59:59Z"}, {siteTag: "${CF_SITE_TAG}"}]`
    const filter7d  = `AND: [{datetime_geq: "${start7d}T00:00:00Z",  datetime_leq: "${today}T23:59:59Z"}, {siteTag: "${CF_SITE_TAG}"}]`

    // Fire all queries in parallel — 7d AND 30d for pages/referrers
    const [
      totals,
      daily7d,
      daily30d,
      pages30d,
      pages7d,
      referrers30d,
      referrers7d,
      devices30d,
      devices7d,
      browsers,
      countries,
      os,
    ] = await Promise.all([
      // Totals summary
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        total30d: rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 1) { count sum { visits } }
        total7d:  rumPageloadEventsAdaptiveGroups(filter: {${filter7d}},  limit: 1) { count sum { visits } }
      } } }`),

      // Daily data 7d
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter7d}}, limit: 10, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
      } } }`),

      // Daily data 30d
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 60, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
      } } }`),

      // Top pages 30d
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 25, orderBy: [count_DESC]) { count dimensions { requestPath } }
      } } }`),

      // Top pages 7d
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter7d}}, limit: 25, orderBy: [count_DESC]) { count dimensions { requestPath } }
      } } }`),

      // Top referrers 30d
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 25, orderBy: [count_DESC]) { count dimensions { refererHost } }
      } } }`),

      // Top referrers 7d
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter7d}}, limit: 25, orderBy: [count_DESC]) { count dimensions { refererHost } }
      } } }`),

      // Devices 30d
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 10, orderBy: [count_DESC]) { count dimensions { deviceType } }
      } } }`),

      // Devices 7d
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter7d}}, limit: 10, orderBy: [count_DESC]) { count dimensions { deviceType } }
      } } }`),

      // Browsers (30d only - less critical)
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 10, orderBy: [count_DESC]) { count dimensions { userAgentBrowser } }
      } } }`),

      // Countries (30d only)
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 30, orderBy: [count_DESC]) { count dimensions { countryName } }
      } } }`),

      // OS (30d only)
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 10, orderBy: [count_DESC]) { count dimensions { userAgentOS } }
      } } }`),
    ])

    const pv30d    = acct(totals).total30d?.[0]?.count || 0
    const pv7d     = acct(totals).total7d?.[0]?.count  || 0
    const visits30d = acct(totals).total30d?.[0]?.sum?.visits || 0
    const visits7d  = acct(totals).total7d?.[0]?.sum?.visits  || 0

    const daily7dData  = (acct(daily7d).rumPageloadEventsAdaptiveGroups  || []).map((r: any) => ({ date: r.dimensions.date, views: r.count, visits: r.sum?.visits || 0 }))
    const daily30dData = (acct(daily30d).rumPageloadEventsAdaptiveGroups || []).map((r: any) => ({ date: r.dimensions.date, views: r.count, visits: r.sum?.visits || 0 }))

    const parsePages = (raw: any) =>
      (raw?.rumPageloadEventsAdaptiveGroups || [])
        .filter((r: any) => r.dimensions.requestPath)
        .map((r: any) => ({ path: r.dimensions.requestPath, views: r.count }))

    const parseReferrers = (raw: any) =>
      (raw?.rumPageloadEventsAdaptiveGroups || [])
        .filter((r: any) => r.dimensions.refererHost)
        .map((r: any) => ({ referrer: r.dimensions.refererHost, views: r.count }))

    const parseDevices = (raw: any) =>
      (raw?.rumPageloadEventsAdaptiveGroups || [])
        .filter((r: any) => r.dimensions.deviceType)
        .map((r: any) => ({ type: r.dimensions.deviceType, views: r.count }))

    const deviceList30d = parseDevices(acct(devices30d))
    const deviceList7d  = parseDevices(acct(devices7d))

    const data = {
      summary: { pageViews30d: pv30d, pageViews7d: pv7d, visits30d, visits7d },

      // Daily broken out by range
      daily:    daily30dData,
      daily7d:  daily7dData,
      daily30d: daily30dData,

      // Top pages — SEPARATE per range
      topPages:      parsePages(acct(pages30d)),
      topPages7d:    parsePages(acct(pages7d)),
      topPages30d:   parsePages(acct(pages30d)),

      // Top referrers — SEPARATE per range
      topReferrers:      parseReferrers(acct(referrers30d)),
      topReferrers7d:    parseReferrers(acct(referrers7d)),
      topReferrers30d:   parseReferrers(acct(referrers30d)),

      // Devices per range
      devices:    deviceList30d,
      devices7d:  deviceList7d,
      devices30d: deviceList30d,

      browsers: (acct(browsers).rumPageloadEventsAdaptiveGroups || []).filter((r: any) => r.dimensions.userAgentBrowser).map((r: any) => ({ browser: r.dimensions.userAgentBrowser, views: r.count })),
      countries: (acct(countries).rumPageloadEventsAdaptiveGroups || []).filter((r: any) => r.dimensions.countryName).map((r: any) => ({ country: r.dimensions.countryName, views: r.count })),
      operatingSystems: (acct(os).rumPageloadEventsAdaptiveGroups || []).filter((r: any) => r.dimensions.userAgentOS).map((r: any) => ({ os: r.dimensions.userAgentOS, views: r.count })),

      // Legacy compat
      publishing: { booksPublished: null, audiobooks: null, podcasts: null, videos: null, history: [] },
      social: { xFollowers: null, igFollowers: null, tiktokFollowers: null, youtubeSubscribers: null, postsThisWeek: null },
      analytics: { pageviews: pv30d, users: null, sessions: null, bounceRate: null, history: daily30dData.map((d: any) => ({ date: d.date, value: d.views })) },
      search: { clicks: null, impressions: null, ctr: null, avgPosition: null, history: [] },
      hasData: pv30d > 0,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics', hasData: false },
      { status: 500 }
    )
  }
}
