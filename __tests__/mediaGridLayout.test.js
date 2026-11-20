/**
 * @format
 */

import {measureGrid} from '../src/utils/mediaGridLayout';

const usedWidth = ({columns, cardWidth, gap, padding}) =>
  cardWidth * columns + gap * (columns - 1) + padding * 2;

describe('measureGrid', () => {
  it('splits a small phone into two cards that fill the row', () => {
    const layout = measureGrid(360, false);

    expect(layout.columns).toBe(2);
    expect(usedWidth(layout)).toBeLessThanOrEqual(360);
    expect(360 - usedWidth(layout)).toBeLessThan(layout.columns);
  });

  it('adds a column instead of stretching cards past the max width', () => {
    expect(measureGrid(430, false).columns).toBe(2);
    expect(measureGrid(480, false).columns).toBe(3);
  });

  it('keeps filling the row as the screen grows', () => {
    [768, 834, 1024, 1280].forEach(width => {
      const layout = measureGrid(width, true);

      expect(layout.columns).toBeGreaterThanOrEqual(4);
      expect(usedWidth(layout)).toBeLessThanOrEqual(width);
      expect(width - usedWidth(layout)).toBeLessThan(layout.columns);
    });
  });

  it('scales the poster with the card', () => {
    const layout = measureGrid(360, false);

    expect(layout.imageHeight).toBe(Math.round(layout.cardWidth * 1.43));
  });
});
