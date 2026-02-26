import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const CF_ACCOUNT_ID = '91ddd4ffd23fb9da94bb8c2a99225a3f'
const CF_SITE_TAG = '55503cb624cd432ab85d4d7f8cef5261'
const CF_GQL = 'https://api.cloudflare.com/client/v4/graphql'

function getToken(request: NextRequest): string {
  // Try Cloudflare env binding first, then process.env
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
    const filter7d = `AND: [{datetime_geq: "${start7d}T00:00:00Z", datetime_leq: "${today}T23:59:59Z"}, {siteTag: "${CF_SITE_TAG}"}]`

    const [totals, daily, pages, referrers, devices, browsers, countries, os] = await Promise.all([
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) { total30d: rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 1) { count sum { visits } } total7d: rumPageloadEventsAdaptiveGroups(filter: {${filter7d}}, limit: 1) { count sum { visits } } } } }`),
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) { rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 60, orderBy: [date_ASC]) { count sum { visits } dimensions { date } } } } }`),
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) { rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 25, orderBy: [count_DESC]) { count dimensions { requestPath } } } } }`),
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) { rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 25, orderBy: [count_DESC]) { count dimensions { refererHost } } } } }`),
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) { rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 10, orderBy: [count_DESC]) { count dimensions { deviceType } } } } }`),
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) { rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 10, orderBy: [count_DESC]) { count dimensions { userAgentBrowser } } } } }`),
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) { rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 30, orderBy: [count_DESC]) { count dimensions { countryName } } } } }`),
      gql(token, `query { viewer { accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) { rumPageloadEventsAdaptiveGroups(filter: {${filter30d}}, limit: 10, orderBy: [count_DESC]) { count dimensions { userAgentOS } } } } }`),
    ])

    const dailyData = (acct(daily).rumPageloadEventsAdaptiveGroups || []).map((r: any) => ({ date: r.dimensions.date, views: r.count, visits: r.sum?.visits || 0 }))
    const pv30d = acct(totals).total30d?.[0]?.count || 0
    const pv7d = acct(totals).total7d?.[0]?.count || 0
    const visits30d = acct(totals).total30d?.[0]?.sum?.visits || 0
    const visits7d = acct(totals).total7d?.[0]?.sum?.visits || 0
    const deviceList = (acct(devices).rumPageloadEventsAdaptiveGroups || []).filter((r: any) => r.dimensions.deviceType).map((r: any) => ({ type: r.dimensions.deviceType, views: r.count }))
    const mobileViews = deviceList.find((d: any) => d.type === 'mobile')?.views || 0

    const data = {
      // New CF analytics fields
      summary: { pageViews30d: pv30d, pageViews7d: pv7d, visits30d, visits7d },
      daily: dailyData,
      topPages: (acct(pages).rumPageloadEventsAdaptiveGroups || []).filter((r: any) => r.dimensions.requestPath).map((r: any) => ({ path: r.dimensions.requestPath, views: r.count })),
      topReferrers: (acct(referrers).rumPageloadEventsAdaptiveGroups || []).filter((r: any) => r.dimensions.refererHost).map((r: any) => ({ referrer: r.dimensions.refererHost, views: r.count })),
      devices: deviceList,
      browsers: (acct(browsers).rumPageloadEventsAdaptiveGroups || []).filter((r: any) => r.dimensions.userAgentBrowser).map((r: any) => ({ browser: r.dimensions.userAgentBrowser, views: r.count })),
      countries: (acct(countries).rumPageloadEventsAdaptiveGroups || []).filter((r: any) => r.dimensions.countryName).map((r: any) => ({ country: r.dimensions.countryName, views: r.count })),
      operatingSystems: (acct(os).rumPageloadEventsAdaptiveGroups || []).filter((r: any) => r.dimensions.userAgentOS).map((r: any) => ({ os: r.dimensions.userAgentOS, views: r.count })),

      // Legacy fields for backward compat with the page
      publishing: { booksPublished: null, audiobooks: null, podcasts: null, videos: null, history: [] },
      social: { xFollowers: null, igFollowers: null, tiktokFollowers: null, youtubeSubscribers: null, postsThisWeek: null },
      analytics: { pageviews: pv30d, users: null, sessions: null, bounceRate: null, history: dailyData.map((d: any) => ({ date: d.date, value: d.views })) },
      search: { clicks: null, impressions: null, ctr: null, avgPosition: null, history: [] },
      hasData: pv30d > 0,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300' } // Cache 5 min
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics', hasData: false },
      { status: 500 }
    )
  }
}
