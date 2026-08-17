import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from "lightweight-charts";

/**
 * Free-hand trend line drawing tool -- lightweight-charts ships no drawing
 * tools at all, so this is a hand-written primitive (the library's own
 * extension point for exactly this) rather than a TradingView Advanced
 * Charts feature we don't have.
 */
export interface TrendLinePoint {
  time: Time;
  price: number;
}

interface LineCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

class TrendLineRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly _lines: LineCoords[]) {}

  draw(target: Parameters<IPrimitivePaneRenderer["draw"]>[0]) {
    target.useMediaCoordinateSpace(({ context }) => {
      context.save();
      context.strokeStyle = "#3b82f6";
      context.lineWidth = 2;
      context.lineCap = "round";
      for (const line of this._lines) {
        context.beginPath();
        context.moveTo(line.x1, line.y1);
        context.lineTo(line.x2, line.y2);
        context.stroke();
      }
      context.restore();
    });
  }
}

class TrendLinePaneView implements IPrimitivePaneView {
  private _coords: LineCoords[] = [];

  constructor(private readonly _source: TrendLinePrimitive) {}

  update() {
    this._coords = this._source.computeCoordinates();
  }

  renderer(): IPrimitivePaneRenderer {
    return new TrendLineRenderer(this._coords);
  }
}

export class TrendLinePrimitive implements ISeriesPrimitive<Time> {
  private _lines: { p1: TrendLinePoint; p2: TrendLinePoint }[] = [];
  private _chart: IChartApi | null = null;
  private _series: ISeriesApi<SeriesType> | null = null;
  private _requestUpdate: (() => void) | null = null;
  private readonly _paneView = new TrendLinePaneView(this);

  attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time>) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  addLine(p1: TrendLinePoint, p2: TrendLinePoint) {
    this._lines.push({ p1, p2 });
    // requestUpdate() alone isn't documented to guarantee updateAllViews()
    // runs before the next paint (it's specced as a viewport-change hook) --
    // refresh the view's cached coordinates directly so a repaint, whenever
    // it happens, always has fresh data to draw.
    this._paneView.update();
    this._requestUpdate?.();
  }

  clear() {
    this._lines = [];
    this._paneView.update();
    this._requestUpdate?.();
  }

  updateAllViews() {
    this._paneView.update();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  computeCoordinates(): LineCoords[] {
    if (!this._chart || !this._series) return [];
    const timeScale = this._chart.timeScale();
    const coords: LineCoords[] = [];
    for (const { p1, p2 } of this._lines) {
      const x1 = timeScale.timeToCoordinate(p1.time);
      const y1 = this._series.priceToCoordinate(p1.price);
      const x2 = timeScale.timeToCoordinate(p2.time);
      const y2 = this._series.priceToCoordinate(p2.price);
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        coords.push({ x1, y1, x2, y2 });
      }
    }
    return coords;
  }
}
