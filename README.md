# Market Heatmap for Gloom

A treemap of the largest US stocks or ETFs, sized by market cap or net assets and colored by the day's move, with live quotes streamed through Gloom's quote feed.

## Install

Requires Gloom 0.15.0 or newer. Gloom restores this plugin once for existing installations when it moves out of the core app: saved panes keep working because the pane and template ids are unchanged, a previously disabled plugin stays disabled, and a deliberate removal is respected.

```sh
gloomberb install gloom-sh/gloom-market-heatmap
```

Open `HM` in the command bar. Also in the hosted web app at term.gloom.sh, where the host proxies the data source.

## Usage

`h`/`j`/`k`/`l` or the arrow keys walk the tiles; activate one to open the ticker. `1` and `2` pick a universe directly, `[` and `]` step through them, `r` refreshes. The universe is also in pane settings, and live streaming toggles from the pane header. The footer says whether quotes are live, mixed, or polled.

## Data

The list of names comes from the Nasdaq and Yahoo Finance screeners (`api.nasdaq.com`, `query1.finance.yahoo.com`). Prices after that come through Gloom's own quote feed, so they use whichever provider is configured, including Gloom Cloud when signed in.

## Development

```sh
bun install
# Link a Gloom checkout, as the plugin installer does:
ln -s /path/to/gloomberb node_modules/gloomberb
ln -s /path/to/gloomberb/node_modules/react node_modules/react
bun run typecheck
bun test
```

`gloomberb` and `react` are peer dependencies, never real ones. Gloom symlinks its own copies into every plugin directory on install and on load, so there is exactly one instance of each in the process. CI links the host the same way.

## License

MIT
