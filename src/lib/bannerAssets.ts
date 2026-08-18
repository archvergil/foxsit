export type BannerAssetKind = 'workout' | 'habits'

export interface BannerAsset {
  id: string
  label: string
  kind: BannerAssetKind
  src: string
}

const buildAssets = (kind: BannerAssetKind, count: number): BannerAsset[] =>
  Array.from({ length: count }, (_, index) => {
    const number = index + 1
    const id = `${kind}_${number}.gif`
    return { id, label: `${kind === 'workout' ? 'Workout' : 'Collection'} ${number}`, kind, src: `/gifs/${id}` }
  })

export const workoutBannerAssets = buildAssets('workout', 13)
export const collectionBannerAssets = buildAssets('habits', 11)
export const bannerAssets = [...workoutBannerAssets, ...collectionBannerAssets]
export const workoutBannerAssetIds = workoutBannerAssets.map(({ id }) => id)
export const collectionBannerAssetIds = collectionBannerAssets.map(({ id }) => id)

export const bannerAssetById = (id: string | null | undefined) =>
  bannerAssets.find((asset) => asset.id === id)
