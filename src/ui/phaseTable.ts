/* Clickable side table: one row per phase (or per step). The current row is
 * highlighted with a progress fill; clicking a row seeks the player there. */

export class PhaseTable {
  private rows: HTMLTableRowElement[] = [];

  constructor(
    private body: HTMLElement,
    private cells: () => string[][],
    private onPick: (i: number) => void,
  ) {
    this.rebuild();
  }

  rebuild(): void {
    this.body.innerHTML = "";
    this.rows = this.cells().map((cols, i) => {
      const tr = document.createElement("tr");
      cols.forEach((c) => {
        const td = document.createElement("td");
        td.textContent = c;
        tr.appendChild(td);
      });
      tr.tabIndex = 0;
      tr.addEventListener("click", () => this.onPick(i));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.onPick(i);
      });
      this.body.appendChild(tr);
      return tr;
    });
  }

  highlight(index: number, frac: number): void {
    this.rows.forEach((tr, i) => {
      const cur = i === index;
      tr.classList.toggle("current", cur);
      tr.classList.toggle("done", i < index);
      tr.style.setProperty("--p", cur ? String(Math.round(frac * 1000) / 10) + "%" : "0%");
    });
  }
}
