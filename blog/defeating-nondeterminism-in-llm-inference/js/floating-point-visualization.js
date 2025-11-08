function toFloatingPoint(num, keepExtra = false) {
    if (num === 0) return { mantissa: 1.00, exponent: 0, stored: 0, extra: '' };

    const sign = num < 0 ? -1 : 1;
    num = Math.abs(num);

    // Find the exponent
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);

    // Normalize if needed
    if (mantissa >= 10) {
        mantissa /= 10;
        exponent++;
    }
    if (mantissa < 1) {
        mantissa *= 10;
        exponent--;
    }

    // Get extra digits for display BEFORE truncation
    let extra = '';
    if (keepExtra) {
        // For more accurate representation, use the original number
        // Calculate what the mantissa should be exactly
        const exactMantissaStr = (num / Math.pow(10, exponent)).toFixed(10);
        const parts = exactMantissaStr.split('.');
        if (parts[1] && parts[1].length > 2) {
            // Get everything after the first 2 decimal places
            extra = parts[1].substring(2).replace(/0+$/, ''); // Remove trailing zeros
        }
    }

    // Truncate mantissa to 2 decimal places for 3-digit mantissa (instead of rounding)
    const truncatedMantissa = Math.floor(mantissa * 100) / 100;

    // Check for overflow/underflow with 1-digit exponent
    if (exponent > 9) {
        return { mantissa: 9.99, exponent: 9, stored: sign * 9.99e9, overflow: true, extra: '' };
    }
    if (exponent < -9) {
        return { mantissa: 1.00, exponent: -9, stored: sign * 1.00e-9, underflow: true, extra: '' };
    }

    // Calculate stored value
    const stored = sign * truncatedMantissa * Math.pow(10, exponent);

    return {
        mantissa: truncatedMantissa,
        exponent: exponent,
        stored: stored,
        sign: sign,
        extra: extra,
        fullMantissa: mantissa
    };
}

function formatFloat(fp, showExtra = false) {
    if (fp.overflow) return "OVERFLOW";
    if (fp.underflow) return "UNDERFLOW";
    const sign = fp.sign < 0 ? "-" : "";

    // Create superscript for exponent
    const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const expSign = fp.exponent < 0 ? '⁻' : '';
    const expAbs = Math.abs(fp.exponent);
    const expSuper = expSign + superscripts[expAbs];

    let mantissaDisplay = `${sign}${fp.mantissa.toFixed(2)}`;
    if (showExtra && fp.extra) {
        mantissaDisplay += `<span class="lost-digits">${fp.extra}</span>`;
    }

    return `${mantissaDisplay} × 10${expSuper}`;
}

function updateCalculation() {
    const num1 = parseFloat(document.getElementById('num1').value) || 0;
    const num2 = parseFloat(document.getElementById('num2').value) || 0;

    // Convert to our floating point representation
    const fp1 = toFloatingPoint(num1);
    const fp2 = toFloatingPoint(num2);

    // Update displays for both numbers
    document.getElementById('num1-rep').innerHTML = formatFloat(fp1);
    document.getElementById('num2-rep').innerHTML = formatFloat(fp2);

    // Perform addition with EXACT values first
    const exactResult = num1 + num2;

    // Then convert the exact result to floating point to see what gets lost
    const exactResultFP = toFloatingPoint(exactResult, true);

    // Update result display with extra digits in red
    const resultElement = document.getElementById('result-rep');
    const exactElement = document.getElementById('exact-value');
    
    resultElement.innerHTML = formatFloat(exactResultFP, true);
    exactElement.textContent = `exact: ${exactResult}`;
    
}

// Add event listeners
document.getElementById('num1').addEventListener('input', updateCalculation);
document.getElementById('num2').addEventListener('input', updateCalculation);

// Initial calculation
updateCalculation();
