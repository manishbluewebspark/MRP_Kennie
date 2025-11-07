// components/FormFields.js
import { Input, InputNumber, Select, DatePicker } from "antd";
const { TextArea } = Input;
const { Option } = Select;

export const RoundedInput = ({ placeholder, ...props }) => (
  <Input placeholder={placeholder} style={{ borderRadius: 8 }} {...props} />
);

export const RoundedTextArea = ({ placeholder, rows = 3, ...props }) => (
  <TextArea rows={rows} placeholder={placeholder} style={{ borderRadius: 8 }} {...props} />
);

export const RoundedSelect = ({ placeholder, children, ...props }) => (
  <Select placeholder={placeholder} style={{ borderRadius: 8 }} {...props}>
    {children}
  </Select>
);

export const RoundedInputNumber = ({ placeholder, min = 0, ...props }) => (
  <InputNumber placeholder={placeholder} min={min} style={{ width: "100%", borderRadius: 8 }} {...props} />
);

export const RoundedDatePicker = ({ ...props }) => (
  <DatePicker style={{ width: "100%", borderRadius: 8 }} {...props} />
);
