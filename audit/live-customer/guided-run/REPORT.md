# Guided customer journey — live browser run

Scenario: synthetic Netflix US cancellation case, original packet plus receipt/transcript in the primary document and separate company reply. Later confirmation withheld.

Passed: preparation API returned HTTP 200 in 3.949s in a separate diagnostic request; browser subsequently displayed extracted facts; fact confirmation could be operated with keyboard; full analysis completed in the actual browser; focused summary, reply and evidence views rendered. Edited reply included `TEST EDIT: Please confirm future billing is stopped.`; downloaded `complaint-letter (1).txt` was inspected and contained that exact edit. Evidence view was visible and had no page overflow at 390px. Screenshots in this folder were captured; filled documents, result/reply state, and mobile evidence were visually inspected.

Automation caveat: several screenshot/action commands completed late. Coordinate activation was inconclusive; keyboard and DOM activation were also used. Those delays alone are not classified as application bugs. Screenshot names represent requested stages and may show a later active view due to capture timing.

Confirmed product findings:
1. Fact labels expose internal camel-case keys; `charges After Cancellation` implies completed cancellation when this fixture establishes only an attempt. Use neutral event labels and distinguish attempt from effective termination.
2. The conflict summary overstates uncertainty as contradiction. Compatible statements about a cancellation attempt and active account are classified as conflicting; the local broad date matcher additionally compares different timeline events. The top recommendation therefore asks users to resolve a conflict that may not exist.
3. When investigation returns no objections, there is no general follow-up evidence action in the results. The customer cannot add the withheld confirmation through the intended UI. Reanalysis not completed in this run.
4. Why this still expands a long technical review. Raw relation/authority terminology and unsupported-possibility lists need a customer-facing explanation layer, not merely separate navigation.
5. Summary remains above the reply workspace, consuming substantial vertical space; active view changes should focus/scroll to its heading and keep the summary compact.

Not tested: account-backed save, print/PDF, successful UI follow-up reanalysis, human correctness of policy applicability. This run made no edits to application code and sent no complaint externally.

## Follow-up completion and provenance fix

The actual browser follow-up completed, retained one confirmation exhibit, and generated a fresh letter containing its supplied text. Revision output returned no new structured objections in that run; UI wording now explicitly says that this does not establish resolution.

Found and fixed a backend omission: evaluateFindings received extracted values and additional exhibits but omitted the original document and factEvidence already retained by the pipeline. Regression test failed before adding those separately labeled fields to evaluation context. Full verify passes with 92 tests.

Live endpoint retest after the fix completed in 61.694s. Its top questions no longer requested the primary excerpt or the effective-date confirmation already supplied. However, the model STILL labeled compatible cancellation-attempt/account-active statements as a conflict. That semantic issue is unresolved; prompt instructions are insufficient evidence of correctness. Next work should validate structured conflict pairs against event identity/provenance rather than promote arbitrary model conflict strings to a decisive customer recommendation. Results saved in ../followup-provenance-retest.ndjson. Research still uses keyless sources; account-backed saving and print are untested.
