import { bech32 } from 'bech32'

export function parseSatsFromZap(event) {
  try {
    const bolt11Tag = event.tags.find((t) => t[0] === 'bolt11')
    if (!bolt11Tag || !bolt11Tag[1]) return 0

    const invoice = bolt11Tag[1]
    const decoded = bech32.decode(invoice, 2000)
    const words = decoded.words

    const hrp = decoded.prefix
    const match = hrp.match(/^ln\w+?(\d+)([munp]?)$/)
    if (!match) return 0

    const amount = parseInt(match[1], 10)
    const multiplier = match[2]

    let millisats
    switch (multiplier) {
      case 'm':
        millisats = amount * 100_000_000
        break
      case 'u':
        millisats = amount * 100_000
        break
      case 'n':
        millisats = amount * 100
        break
      case 'p':
        millisats = amount * 0.1
        break
      default:
        millisats = amount * 100_000_000_000
    }

    return Math.floor(millisats / 1000)
  } catch (err) {
    console.warn('[zapUtils] Failed to parse bolt11 for event', event.id, err)
    return 0
  }
}

export function getETag(event) {
  const tag = event.tags.find((t) => t[0] === 'e')
  return tag ? tag[1] : null
}

export function getPTag(event) {
  const tag = event.tags.find((t) => t[0] === 'p')
  return tag ? tag[1] : null
}

export function getTitleFromEvent(event) {
  const tag = event.tags.find((t) => t[0] === 'title')
  return tag ? tag[1] ?? '' : ''
}

export function getDTag(event) {
  const tag = event.tags.find((t) => t[0] === 'd')
  return tag ? tag[1] ?? '' : ''
}
