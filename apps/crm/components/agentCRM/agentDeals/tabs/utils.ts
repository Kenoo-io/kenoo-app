export const calculatePayoutDate = (liveDueDate: string, payoutNet: string): string => {
  if (!liveDueDate) {
    console.log("No live due date provided for payout calculation");
    return '';
  }
  
  try {
    const date = new Date(liveDueDate);
    if (isNaN(date.getTime())) {
      console.log("Invalid live due date format:", liveDueDate);
      return '';
    }
    
    const days = parseInt(payoutNet) || 0;
    date.setDate(date.getDate() + days);
    
    // Format as ISO string but only take the date part
    const result = date.toISOString().split('T')[0];
    console.log(`Calculated payout date: ${result} from live date ${liveDueDate} + ${days} days`);
    return result;
  } catch (error) {
    console.error('Error calculating payout date:', error);
    return '';
  }
};

export const calculateExpectedNet = (amount: string, split: string, probability: string): string => {
  try {
    const amountValue = parseFloat(amount) || 0;
    const splitValue = parseFloat(split) || 0;
    const probabilityValue = parseFloat(probability) || 0;
    
    const companyCommission = amountValue * (splitValue / 100);
    const expectedNet = companyCommission * (probabilityValue / 100);
    
    return expectedNet.toFixed(2);
  } catch (error) {
    console.error('Error calculating expected net:', error);
    return '0';
  }
};

export const calculateExpectedRevenue = (amount: string, probability: string): string => {
  try {
    const amountValue = parseFloat(amount) || 0;
    const probabilityValue = parseFloat(probability) || 0;
    
    const expectedRevenue = amountValue * (probabilityValue / 100);
    
    return expectedRevenue.toFixed(2);
  } catch (error) {
    console.error('Error calculating expected revenue:', error);
    return '0';
  }
}; 