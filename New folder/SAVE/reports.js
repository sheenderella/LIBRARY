async function generateReport(reportType) {
    const { jsPDF } = window.jspdf; // Access jsPDF

    const doc = new jsPDF(); // Create a new jsPDF instance

    switch (reportType) {
        case 'totalBooks':
            doc.text("Total Books Inventory Report", 10, 10);
            doc.text("Overview of all books in the library, including genres and categories.", 10, 20);
            break;
        case 'booksByGenre':
            doc.text("Books by Genre/Category Report", 10, 10);
            doc.text("Breakdown of books available by genre or category.", 10, 20);
            break;
        case 'newArrivals':
            doc.text("New Arrivals Report", 10, 10);
            doc.text("List of newly added books to the library.", 10, 20);
            break;
        case 'currentBorrowed':
            doc.text("Current Borrowed Books Report", 10, 10);
            doc.text("List of books currently checked out, along with borrower details.", 10, 20);
            break;
        case 'borrowingHistory':
            doc.text("Borrowing History Report", 10, 10);
            doc.text("Detailed history of books borrowed over a specific period.", 10, 20);
            break;
        case 'mostBorrowed':
            doc.text("Most Borrowed Books Report", 10, 10);
            doc.text("Ranking of the most borrowed books in a specific timeframe.", 10, 20);
            break;
        default:
            alert("Invalid report type.");
            return;
    }

    // Save the generated PDF
    doc.save(`${reportType.replace(/([A-Z])/g, ' $1').trim()}.pdf`);
}
