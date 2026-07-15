const formatRevenue = (value: number | string): string => {
  if (!value) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '';
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
  }
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `$${num}`;
};

interface AnnualRevenueProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AnnualRevenue({ formData, handleInputChange }: AnnualRevenueProps) {
  const formattedRevenue = formData.annualRevenue ? formatRevenue(formData.annualRevenue) : "$0";

  return (
    <div className="bg-gray-50 rounded-[30px] p-6">
      <div className="flex items-center">
        <h2 className="text-black font-black text-4xl">ANNUAL REVENUE</h2>
        <div className="flex-1 border-t border-black h-[1px] mx-4" />
        <p className="text-black font-black text-4xl">{formattedRevenue}</p>
      </div>
    </div>
  );
}
