import type { WorksheetApiRecord } from "../../../shared/contracts/worksheet-api";

type Props = {
  conflict: WorksheetApiRecord;
  onReload(): void;
  onSaveCopy(): void;
};

export function WorksheetConflictBanner({
  conflict,
  onReload,
  onSaveCopy,
}: Props) {
  return (
    <section className="sync-conflict" role="alert">
      <div>
        <strong>Newer server revision detected.</strong>
        <span>
          Your local draft is preserved and has not overwritten revision{" "}
          {conflict.revision}.
        </span>
      </div>
      <button type="button" onClick={onReload}>
        Load server version
      </button>
      <button type="button" onClick={onSaveCopy}>
        Save draft as copy
      </button>
    </section>
  );
}
