"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { FiUpload, FiFile } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ContractProps {
  formData: any;
  setFormData: (formData: any) => void;
}

export default function Contract({ formData, setFormData }: ContractProps) {
  const [fileError, setFileError] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [hasExistingContract, setHasExistingContract] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if there's an existing contract
    setHasExistingContract(!!formData.contractFileUrl && !!formData.contractFileName);
  }, [formData.contractFileUrl, formData.contractFileName]);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    
    // Check if file is a PDF
    if (file.type !== "application/pdf") {
      setFileError("Only PDF files are allowed");
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File size should be less than 10MB");
      return;
    }

    setFileError("");
    
    try {
      setIsUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("dealId", formData.dealId || "unnamed");

      const response = await fetch('/api/upload-contract/upload-deal-contract', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload contract");
      }

      const data = await response.json();
      
      setFormData((prev: any) => ({
        ...prev,
        contractFileName: data.fileName,
        contractFileUrl: data.downloadUrl
      }));
      
      wallsToast.success("Success", "Contract uploaded successfully");
      
      setHasExistingContract(true);
    } catch (error) {
      console.error("Error uploading contract:", error);
      setFileError(error instanceof Error ? error.message : "Failed to upload contract");
      wallsToast.error("Error", error instanceof Error ? error.message : "Failed to upload contract");
    } finally {
      setIsUploading(false);
    }
  }, [formData.dealId, setFormData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isUploading
  });
  
  const viewContract = () => {
    if (formData.contractFileUrl) {
      window.open(formData.contractFileUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Contract Container */}
      <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">CONTRACT</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="space-y-6">
          {!hasExistingContract ? (
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-[50px] p-10 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? "border-blue-400 bg-blue-50" 
                  : "border-gray-300 hover:bg-gray-50"
              } ${isUploading ? "opacity-75 cursor-not-allowed" : ""}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-4">
                {isUploading ? (
                  <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
                ) : (
                  <FiUpload className="h-12 w-12 text-gray-400" />
                )}
                <div className="space-y-1">
                  <p className="text-lg font-medium">
                    {isUploading ? "Uploading..." : "Upload Contract"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {isUploading 
                      ? "Please wait while we process your file"
                      : "Drag and drop a PDF file here, or click to select"}
                  </p>
                  <p className="text-xs text-gray-400">
                    PDF only, max 10MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="border-2 rounded-[50px] p-8 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              onClick={viewContract}
            >
              <div className="flex items-start">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 p-4 rounded-full group-hover:bg-blue-100 transition-colors">
                    <FiFile className="h-8 w-8 text-gray-700 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-blue-600 transition-colors">{formData.contractFileName}</p>
                    <p className="text-sm text-gray-500 mt-1 group-hover:text-blue-500 transition-colors">
                      Click to view contract
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {fileError && (
            <p className="text-red-500 text-sm mt-2">{fileError}</p>
          )}

          <div className="bg-gray-50/30 rounded-[15px] p-4">
            <h3 className="font-medium mb-2">Contract Information</h3>
            <p className="text-sm text-gray-600">
              {hasExistingContract 
                ? "This deal has a signed contract on file. Click on the contract above to view it."
                : "No contract is currently on file for this deal. Upload the signed contract for this deal."}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {hasExistingContract 
                ? "The contract contains important information about the deal terms, conditions, and deliverables. Contracts are permanent records and cannot be deleted."
                : "Ensure all deal terms, conditions, and deliverables are properly documented in the contract before uploading."}
            </p>
          </div>
          
          {hasExistingContract && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Need to replace the contract with a new version?</p>
              <div 
                {...getRootProps()} 
                className="border-2 border-dashed rounded-[50px] p-6 text-center cursor-pointer transition-colors bg-gray-50 hover:bg-gray-100"
              >
                <input {...getInputProps()} />
                <div className="flex items-center justify-center gap-2">
                  <FiUpload className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-500">Upload a new contract version</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
