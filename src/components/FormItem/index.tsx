import React from "react";

export interface FormItemProps {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
  className?: string;
}

const FormItem = ({ label, value, type = "text", onChange, className = "" }: FormItemProps) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`flex flex-col gap-[5px] ${className}`}>
      <p className="text-[12px] text-gray-500">{label}</p>
      <input
        type={type}
        placeholder={`请输入${label}`}
        value={value}
        onChange={handleInputChange}
        className="w-full h-[40px] rounded-md border border-gray-300 p-[5px] text-[14px]"
      />
    </div>
  );
};

export default FormItem;
