import { HistoryBatch } from "@/components/history-list"

export function exportHistoryToCsv(batch: HistoryBatch) {
    const headers = ["Timestamp", "Email", "Status", "Error"];
    const rows = batch.results.map(r => [
        r.timestamp,
        r.email,
        r.success ? "Success" : "Failed",
        r.error || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
        + [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ionos_mailer_export_${batch.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
