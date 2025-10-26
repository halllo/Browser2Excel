import detectionRules from './detection-rules.json';

/**
 * Transaction DTO class for displaying processed transaction data
 */
class Transaction {
    constructor(id, description, kind, frequency, date, amount, svg) {
        this.id = id;
        this.description = description;
        this.kind = kind;
        this.frequency = frequency;
        this.date = date;
        this.amount = amount;
        this.svg = svg;
    }
}

/**
 * Transaction class representing a financial transaction
 */
class RawTransaction {
    constructor(id, content, date = null, arialabel = null) {
        this.id = id;
        this.content = content;
        this.date = date;
        this.arialabel = arialabel;
    }

    /**
     * Date format constant
     */
    static get DATE_FORMAT() {
        return 'yyyy-MM-dd-HH.mm.ss.ffffff';
    }

    /**
     * Parse the date string to a Date object
     * @returns {Date|null} Parsed date or null if parsing fails
     */
    get parsedDate() {
        if (!this.date) return null;
        
        // Convert .NET format to JavaScript compatible format
        // yyyy-MM-dd-HH.mm.ss.ffffff -> yyyy-MM-ddTHH:mm:ss.SSS
        const jsFormat = this.date
            .replace(/(\d{4})-(\d{2})-(\d{2})-(\d{2})\.(\d{2})\.(\d{2})\.(\d{6})/, '$1-$2-$3T$4:$5:$6.$7')
            .substring(0, 23); // Truncate to milliseconds
        
        const parsed = new Date(jsFormat);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    /**
     * Extract transaction details from arialabel
     * @returns {Object} Object with receiver (Umsatz), topic (Verwendungszweck), and amount
     */
    details() {
        if (!this.arialabel) {
            return { receiver: '', topic: '', amount: 0 };
        }

        const regex = /Umsatz:\s;\s(?<umsatz>.*?)\s;\sVerwendungszweck:\s;\s(?<verwendungszweck>.*?)\s;\sBetrag:\s;\s(?<betrag>.*?)\s/;
        const match = this.arialabel.match(regex);
        
        if (match) {
            // Handle German number format: thousands separator (.) and decimal separator (,)
            const rawAmount = match.groups.betrag.replace(/\./g, '').replace(',', '.');
            const amount = parseFloat(rawAmount) * -1;
            return {
                receiver: match.groups.umsatz,
                topic: match.groups.verwendungszweck.replace('LINEBREAKCODE', ''),
                amount: amount
            };
        }
        
        return { receiver: '', topic: '', amount: 0 };
    }
}

/**
 * Helper function to check if a string contains a substring (case-insensitive)
 * @param {string} full - The full string to search in
 * @param {string} substring - The substring to search for
 * @returns {boolean} True if substring is found
 */
function isSub(full, substring) {
    return full.toLowerCase().includes(substring.toLowerCase());
}

function seemsLike(test, target) {
    return false;
}

/**
 * Apply detection rules to classify transactions
 * @param {string} receiver - The receiver field
 * @param {string} topic - The topic field
 * @returns {Object} Object with description, kind, and frequency
 */
function applyDetectionRules(transaction, receiver, topic, svg) {
    const conditionEval = function(condition) {
        const fieldValue = condition.field === "svg" ? svg : condition.field === "receiver" ? receiver : topic;
        if (fieldValue && condition.contains) {
            return isSub(fieldValue, condition.contains);
        } else if (fieldValue && condition.seemslike) {
            console.info(`TODO: does ${fieldValue} seem like ${condition.seemslike}?`, transaction);
            return seemsLike(fieldValue, condition.seemslike);
        }
        return false;
    }
    
    // Check each rule in order
    for (const rule of detectionRules.rules) {
        let ruleMatches = false;

        // If no operator is specified, default to AND behavior
        const operator = rule.operator || "AND";
        
        if (operator === "OR") {
            // Any condition must match (OR)
            ruleMatches = rule.conditions.some(conditionEval);
        } else {
            // All conditions must match (AND)
            ruleMatches = rule.conditions.every(conditionEval);
        }

        if (ruleMatches) {
            // Replace placeholders in result
            const result = {
                description: rule.result.description.replace('${receiver}', receiver).replace('${topic}', topic),
                kind: rule.result.kind,
                frequency: rule.result.frequency
            };
            return result;
        }
    }
    
    // No rule matched, use default
    const defaultResult = {
        description: detectionRules.defaultRule.description.replace('${receiver}', receiver).replace('${topic}', topic),
        kind: detectionRules.defaultRule.kind,
        frequency: detectionRules.defaultRule.frequency
    };
    return defaultResult;
}

/**
 * Get displayable transactions from browser response
 */
function parseBrowserResponse(data) {
    console.log("Parsing data:", data);
    const url = data.url;
    const elements = data.elements.map(element => new RawTransaction(element.id, element.content, element.date, element.arialabel));
    
    // Filter transactions with valid dates and reverse order
    const validTransactions = elements
        .filter(t => t.parsedDate !== null)
        .reverse();

    const results = [];

    for (const transaction of validTransactions) {
        const { receiver, topic, amount } = transaction.details();

        // Format date as dd/MM/yyyy
        const date = transaction.parsedDate?.toLocaleDateString('en-GB');

        const svgMatch = transaction.content.match(/<svg.*?>(.*?)<\/svg>/)
        const svg = svgMatch?.[0];

        // Apply detection rules to get description, kind, and frequency
        const { description, kind, frequency } = applyDetectionRules(transaction, receiver, topic, svg);
        
        const result = new Transaction(
            transaction.id,
            description,
            kind,
            frequency,
            date,
            amount,
            svg
        );
        results.push(result);
    }

    return results;
}

/**
 * Get displayable transactions from /extract response.
 */
function parseExtractResponse(data) {
    console.log("Parsing data:", data);
    const results = [];
    for (const [index, booking] of data.bookings.entries()) {
        const date = (new Date(booking.buchungsDatum)).toLocaleDateString('en-GB');
        const { description, kind, frequency } = applyDetectionRules(booking, booking.zweck, booking.zweck, undefined);
        const result = new Transaction(
            index,
            description,
            kind,
            frequency,
            date,
            booking.betragInEuro,
            undefined
        );
        results.push(result);
    }

    return results;
}

// ES6 exports
export { parseBrowserResponse, parseExtractResponse };
