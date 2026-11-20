/* Cards always fill the row: the column count comes from how many cards wider
 * than `minCard` fit, and once a card would grow past `maxCard` another column
 * is added instead of stretching it. */
const LAYOUT = {
  phone: {gap: 8, padding: 8, minCard: 150, maxCard: 210},
  tablet: {gap: 14, padding: 16, minCard: 170, maxCard: 230},
};

const POSTER_ASPECT = 1.43;
const MAX_COLUMNS = 10;

export const measureGrid = (width, isTablet) => {
  const {gap, padding, minCard, maxCard} = isTablet
    ? LAYOUT.tablet
    : LAYOUT.phone;
  const available = Math.max(width - padding * 2, minCard);

  let columns = Math.max(1, Math.floor((available + gap) / (minCard + gap)));
  while (
    columns < MAX_COLUMNS &&
    (available - gap * (columns - 1)) / columns > maxCard
  ) {
    columns += 1;
  }

  const cardWidth = Math.floor((available - gap * (columns - 1)) / columns);

  return {
    gap,
    padding,
    columns,
    cardWidth,
    imageHeight: Math.round(cardWidth * POSTER_ASPECT),
  };
};
