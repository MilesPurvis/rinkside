# Responsible Disclosure — FloSports / FloHockey

**To:** FloSports Security Team
**Subject:** Unauthenticated Access to Premium Video Content via Public API Endpoints
**Date:** April 8, 2026
**Reporter:** Miles Purvis

---

## Summary

Several FloSports API endpoints expose premium video content without requiring authentication. This includes live stream preview tokens and full-length VOD replay URLs that are accessible to any unauthenticated client. These appear to be unintentional, as the content is marked `isPremium: true` in the API responses and requires a paid subscription on the FloHockey website.

## Affected Endpoints

### 1. Live Stream Preview Tokens (No Auth Required)

**Endpoint:**
```
POST https://live-api-3.flosports.tv/streams/{streamId}/tokens/preview
Content-Type: application/json

{"adTracking":{"appName":"flosports-web"}}
```

**Issue:** This endpoint returns a signed HLS playlist URL for any active stream without requiring authentication. The `Authorization` header can be empty or omitted entirely. The returned token grants access to a live video feed (low quality, ~80p), and new tokens can be requested indefinitely to maintain continuous playback.

**Impact:** Any live event on any FloSports vertical (hockey, wrestling, racing, etc.) can be viewed without a subscription by repeatedly requesting preview tokens.

**Stream IDs** are discoverable via the public watch endpoint:
```
GET https://api.flohockey.tv/api/experiences/web/watch?version=1.7.82&limit=50&offset=0&site_id=29
```
Each live event in the response includes `live_event.stream_list[].stream_id`.

### 2. VOD Replay Playlists (No Auth, No Expiry)

**Endpoint:**
```
GET https://api.flohockey.tv/api/experiences/web/partials/video/{videoId}?version=1.33.2&tz=America/Toronto
```

**Issue:** This endpoint returns a direct CloudFront HLS playlist URL for full-length game replays. These URLs require no authentication, no tokens, and do not expire. The content is full quality (not preview-limited).

**Example response field:**
```json
{
  "data": {
    "videoPlayer": {
      "contentMetadata": {
        "isPremium": true,
        "playlist": "https://d17cyqyz9yhmep.cloudfront.net/us-east-1/streams/{streamId}/playlist_{start}_{end}.m3u8"
      }
    }
  }
}
```

The CloudFront URL is directly playable with any HLS-compatible player (VLC, hls.js, Safari, etc.) and can be shared or embedded without restriction.

**Video IDs** are discoverable via:
```
GET https://api.flohockey.tv/api/experiences/web/event-hub/{eventId}/videos?version=1.33.2&tz=America/Toronto&site_id=29
```

### 3. Cross-Vertical API Access

**Issue:** The FloSports BFF API (`api.flohockey.tv`) serves content for all 25+ FloSports verticals. Changing the `site_id` parameter returns content from FloWrestling, FloTrack, FloRacing, etc. The API domain is irrelevant — `api.flobaseball.tv` with `site_id=29` returns hockey data. This means the above issues affect all FloSports properties, not just FloHockey.

## Reproduction Steps

### Live stream access:
1. Fetch `https://api.flohockey.tv/api/experiences/web/watch?version=1.7.82&limit=50&offset=0&site_id=29` with headers `x-flo-app: flosports-webapp` and `x-301-location: web`
2. Find any item with `live_event.status: "LIVE"` and note the `stream_id` from `live_event.stream_list[0]`
3. POST to `https://live-api-3.flosports.tv/streams/{streamId}/tokens/preview` with body `{"adTracking":{"appName":"flosports-web"}}`
4. The response contains `data.uri` — a signed HLS URL playable in any browser or media player

### VOD replay access:
1. Fetch any concluded event's videos: `https://api.flohockey.tv/api/experiences/web/event-hub/{eventId}/videos?version=1.33.2&tz=America/Toronto&site_id=29`
2. Note the `action.analytics.nodeId` for any video
3. Fetch `https://api.flohockey.tv/api/experiences/web/partials/video/{videoId}?version=1.33.2&tz=America/Toronto`
4. The response contains `data.videoPlayer.contentMetadata.playlist` — a CloudFront URL that plays the full replay without any authentication

## Recommended Fixes

1. **Preview tokens:** Require a valid session or API key. Consider rate-limiting or CAPTCHA for unauthenticated requests. The preview endpoint appears designed for the website's thumbnail previews but grants enough access for continuous viewing.

2. **VOD playlist URLs:** The video detail endpoint should not return the raw CloudFront URL to unauthenticated users. Consider returning a signed URL with expiry, or requiring a subscription token to access the playlist.

3. **CloudFront distribution:** Add signed URL or signed cookie requirements to the VOD CloudFront distribution (`d17cyqyz9yhmep.cloudfront.net`) so that even if a playlist URL is leaked, it expires.

4. **Cross-vertical isolation:** Consider validating `site_id` against the requesting domain or requiring per-vertical API keys.

## Scope & Intent

This was discovered during a personal project to build a hockey streaming dashboard. No data was exfiltrated, shared publicly, or used commercially. No authentication systems were bypassed — all access was through publicly reachable endpoints using standard HTTP requests. I am reporting this in good faith so that FloSports can address these issues.

I have not published this information and will not do so. I am happy to coordinate on a disclosure timeline.
