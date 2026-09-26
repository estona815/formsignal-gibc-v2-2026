# FormSignal

FormSignal is a browser-only form-flow explorer built for GIBC V2 Track 03: Open. It checks a small directed graph of form steps for paths that cannot finish, cycles, unreachable steps, and fields that a later step needs but an earlier step does not guarantee. A local simulator lets a designer follow Yes/No routes and experience a dead end. No user input leaves the browser.

## Run

Requires Node.js 20.19+ and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the printed local URL. `pnpm test` runs the graph-engine checks; `pnpm build` produces the static site in `dist/`.

## Explore

1. Load the sample with a missing No branch and an optional email that Review expects.
2. Choose No in the live simulator to see the dead end.
3. Route No to Review and mark Contact's email input required, then run the audit again.
4. Load the repaired example to compare both completed paths.
5. Export a JSON report; it is generated locally and is not uploaded.

## Scope and limitations

This is an educational design-time graph check, not a WCAG or legal compliance certification. It does not inspect real websites, verify screen-reader behavior, or prove that a person filled an input. The “required value” check models a guaranteed validation rule in the supplied flow. The sample uses fictional newsletter steps; no real account or personal data is required.

## Built with and credit

React 19, Vite 7, HTML, CSS, JavaScript, SVG, and Node.js test runner. The primary interface visual concept was generated with OpenAI ImageGen; the shipped interface, flow engine, SVG graph, copy, examples, and tests were implemented as source code with AI coding assistance. No external datasets, remote model APIs, or paid services are used.

## Roadmap

Future work could add an import format for form schemas, richer rule expressions, path coverage for larger graphs, keyboard/screen-reader test protocols, and collaborative review. This prototype intentionally limits steps to eight and does not claim to replace human accessibility testing.
