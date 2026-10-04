// Bir sonraki yayinlanacak konuyu tema agirligina (weight) gore secer.
// Agirlik rastgele degil, gecmiste o temadan ne kadar az yayinlandigina gore azalan bir siralama beklenir
// (repository sorgusu bunu saglar); burada sadece "hangi tema once" karari saf fonksiyon olarak izole edilir.
export const pickNextThemeId = (activeThemes) => {
  if (!activeThemes.length) return null;
  const totalWeight = activeThemes.reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * totalWeight;
  for (const theme of activeThemes) {
    r -= theme.weight;
    if (r <= 0) return theme.id;
  }
  return activeThemes[activeThemes.length - 1].id;
};
