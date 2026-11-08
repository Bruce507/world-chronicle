/* Source classification shared by the QA report and the tagging script.
   Tiers:
     institutional - museum, archive, library, university, UN body, government
     encyclopedic  - Britannica / Wikipedia (useful, but not an institution)
     secondary     - everything else (media, think tanks, personal pages) */
export const ENCYCLOPEDIC = /(^|\.)britannica\.com$|(^|\.)wikipedia\.org$/;
export const INSTITUTIONAL = [
  /(^|\.)unesco\.org$/, /(^|\.)un\.org$/, /(^|\.)who\.int$/, /(^|\.)iaea\.org$/, /(^|\.)unfccc\.int$/,
  /(^|\.)oecd\.org$/, /(^|\.)worldbank\.org$/, /(^|\.)imf\.org$/, /(^|\.)europa\.eu$/,
  /(^|\.)archives\.gov$/, /(^|\.)loc\.gov$/, /(^|\.)nps\.gov$/, /(^|\.)si\.edu$/, /(^|\.)nasa\.gov$/,
  /(^|\.)usgs\.gov$/, /(^|\.)army\.mil$/, /(^|\.)defense\.gov$/, /(^|\.)congress\.gov$/, /(^|\.)state\.gov$/,
  /(^|\.)nationalarchives\.gov\.uk$/, /(^|\.)parliament\.uk$/, /(^|\.)bl\.uk$/, /(^|\.)britishmuseum\.org$/,
  /(^|\.)iwm\.org\.uk$/, /(^|\.)nam\.ac\.uk$/, /(^|\.)railwaymuseum\.org\.uk$/,
  /(^|\.)ushmm\.org$/, /(^|\.)yadvashem\.org$/, /(^|\.)auschwitz\.org$/, /(^|\.)nobelprize\.org$/,
  /(^|\.)metmuseum\.org$/, /(^|\.)hpmmuseum\.jp$/, /(^|\.)911memorial\.org$/, /(^|\.)19371213\.(net|com\.cn|org\.cn)$/,
  /(^|\.)teara\.govt\.nz$/, /(^|\.)tepapa\.govt\.nz$/, /(^|\.)chateauversailles\.fr$/,
  /(^|\.)edu$/, /(^|\.)ac\.uk$/, /(^|\.)ac\.nz$/, /(^|\.)cern\.ch$/,
];
export const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
export const isInstitutional = (u) => INSTITUTIONAL.some((re) => re.test(host(u)));
export const isEncyclopedic = (u) => ENCYCLOPEDIC.test(host(u));
export function classifySource(url) {
  if (isInstitutional(url)) return "institutional";
  if (isEncyclopedic(url)) return "encyclopedic";
  return "secondary";
}
