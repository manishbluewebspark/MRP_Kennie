// // components/AddChildPartModal.js
// import React, { useEffect, useState } from "react";
// import { Form, Input, Select, InputNumber, notification } from "antd";
// import GlobalModal from "components/GlobalModal";

// const { Option } = Select;

// const AddChildPartModal = ({ visible, onCancel, onSubmit, formData, mpnOptions, categories = [] }) => {
//   const [form] = Form.useForm();
//   const [category, setCategory] = useState("");
//   // console.log('-----formData',formData)
//   // Prefill form for edit
//   useEffect(() => {
//     if (formData) {
//       form.setFieldsValue({
//         childPartNo: formData?.ChildPartNo,
//         linkedMpn: formData?.mpn?._id,
//         LinkedMPNCategory: formData?.LinkedMPNCategory || "",
//         status: formData?.status || "Active",
//       });
//       setCategory(formData?.LinkedMPNCategory || "");
//     } else {
//       form.resetFields();
//       setCategory("");
//     }
//   }, [formData, form]);

//   // Update category when MPN changes
//   const handleMpnChange = (mpnId) => {
//     const selectedMpn = mpnOptions.find(m => m.value === mpnId);
//     // console.log('------LinkedMPNCategory',selectedMpn)
//     if (selectedMpn) {
//       setCategory(selectedMpn.category || "");
//       form.setFieldsValue({ LinkedMPNCategory: selectedMpn.category || "" });
//     }
//   };



// const handleOk = () => {
//   form.validateFields().then(values => {
//     // Check category
//     if (!values.LinkedMPNCategory) {
//       notification.warning({
//         message: 'Select Category',
//         description: 'Category is required',
//       });
//       return; // Don't submit
//     }
    
//     // Submit only with category
//     onSubmit(values);
//     form.resetFields();
//   });
// };

//   return (
//     <GlobalModal
//       visible={visible}
//       onCancel={() => {
//         onCancel();
//         form.resetFields();
//         setCategory("");
//       }}
//       onOk={handleOk}
//       header={formData ? "Edit Child Part" : "Add New Child Part"}
//       okText={formData ? "Update" : "Submit"}
//       width={500}
//     >
//       <Form form={form} layout="vertical">
//         {/* Child Part No */}
//         <Form.Item
//           label="Child Part No"
//           name="childPartNo"
//           rules={[{ required: true, message: "Please enter child part number" }]}
//         >
//           <Input placeholder="Enter child part number" />
//         </Form.Item>

//         {/* Linked MPN */}
//         <Form.Item
//           label="Linked MPN"
//           name="linkedMpn"
//           rules={[{ required: true, message: "Please select an MPN" }]}
//         >
//           <Select placeholder="Select MPN" onChange={handleMpnChange}>
//             {mpnOptions.map(mpn => (
//               <Option key={mpn.value} value={mpn.value}>
//                 {mpn.label}
//               </Option>
//             ))}
//           </Select>
//         </Form.Item>

//         {/* Category (Auto-populated) */}
//         <Form.Item label="Category" name="LinkedMPNCategory">
//           <Select placeholder="Auto-populated from selected MPN" disabled>
//             {categories.map(option => (
//               <Option key={option._id} value={option._id}>
//                 {option.name}
//               </Option>
//             ))}
//           </Select>
//         </Form.Item>

//         {/* Status */}
//         <Form.Item
//           label="Status"
//           name="status"
//         >
//           <Select placeholder="Select status">
//             <Option value="Active">Active</Option>
//             <Option value="Inactive">Inactive</Option>
//           </Select>
//         </Form.Item>
//       </Form>
//     </GlobalModal>
//   );
// };

// export default AddChildPartModal;


// components/AddChildPartModal.js
import React, { useEffect, useState } from "react";
import { Form, Input, Select, notification } from "antd";
import GlobalModal from "components/GlobalModal";

const AddChildPartModal = ({
  visible,
  onCancel,
  onSubmit,
  formData,
  mpnOptions,
  categories = [],
}) => {
  const [form] = Form.useForm();
  const [category, setCategory] = useState("");
  // ✅ Prefill (EDIT FIX SAFE)
  useEffect(() => {
    if (formData) {
      form.setFieldsValue({
        childPartNo: formData?.ChildPartNo,
        linkedMpn: formData?.mpn?._id || formData?.linkedMpn,
        LinkedMPNCategory: formData?.LinkedMPNCategory || "",
        status: formData?.status || "Active",
      });

      setCategory(formData?.LinkedMPNCategory || "");
    } else {
      form.resetFields();
      setCategory("");
    }
  }, [formData, form]);

  // ✅ MPN change handler
  const handleMpnChange = (mpnId) => {
    const selectedMpn = mpnOptions.find((m) => m.value === mpnId);
    // console.log('----selectedMpn',selectedMpn)
    if (selectedMpn) {
      const cat = selectedMpn.categoryId || "";
      setCategory(cat);

      form.setFieldsValue({
        LinkedMPNCategory: cat,
      });
    }
  };

  // ✅ Submit fix (Bug 9 safe)
  const handleOk = () => {
    form.validateFields().then((values) => {
      if (!values.LinkedMPNCategory) {
        notification.warning({
          message: "Select Category",
          description: "Category is required",
        });
        return;
      }

      // ✅ Ensure correct payload
      const payload = {
        ...values,
        linkedMpn: values.linkedMpn, // only ObjectId
      };

      onSubmit(payload);
      form.resetFields();
      setCategory("");
    });
  };

  return (
    <GlobalModal
      visible={visible}
      onCancel={() => {
        onCancel();
        form.resetFields();
        setCategory("");
      }}
      onOk={handleOk}
      header={formData ? "Edit Child Part" : "Add New Child Part"}
      okText={formData ? "Update" : "Submit"}
      width={500}
    >
      <Form form={form} layout="vertical">
        {/* Child Part No */}
        <Form.Item
          label="Child Part No"
          name="childPartNo"
          rules={[{ required: true, message: "Please enter child part number" }]}
        >
          <Input placeholder="Enter child part number" />
        </Form.Item>

        {/* ✅ FIXED: Searchable Linked MPN */}
        <Form.Item
          label="Linked MPN"
          name="linkedMpn"
          rules={[{ required: true, message: "Please select an MPN" }]}
        >
          <Select
            placeholder="Type to search MPN"
            showSearch
            optionFilterProp="children"
            onChange={handleMpnChange}
            filterOption={(input, option) =>
              option.children
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {mpnOptions.map((mpn) => (
              <Select.Option key={mpn.value} value={mpn.value}>
                {mpn.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Category */}
        <Form.Item label="Category" name="LinkedMPNCategory">
          <Select disabled placeholder="Auto-filled">
            {categories.map((option) => (
              <Select.Option key={option._id} value={option._id}>
                {option.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Status */}
        <Form.Item label="Status" name="status">
          <Select>
            <Select.Option value="Active">Active</Select.Option>
            <Select.Option value="Inactive">Inactive</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </GlobalModal>
  );
};

export default AddChildPartModal;
