"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Upload } from "lucide-react";

export const ServiceRequestForm = () => {
  const [formData, setFormData] = useState({
    serviceType: "",
    address: "",
    description: "",
    phone: "",
    photo: null,
    commonProblem: "",
  });

  const serviceTypes = [
    { id: "plumbing", label: "Сантехника" },
    { id: "electrical", label: "Электрика" },
    { id: "locksmith", label: "Слесарь" },
    { id: "carpenter", label: "Плотник" },
  ];

  const commonProblems = {
    plumbing: ["Протечка крана", "Засор канализации", "Замена смесителя"],
    electrical: ["Замена розетки", "Установка люстры", "Короткое замыкание"],
    locksmith: ["Замена замка", "Открытие двери", "Ремонт замка"],
    carpenter: ["Ремонт двери", "Установка полок", "Сборка мебели"],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        formDataToSend.append(key, formData[key]);
      });

      const response = await fetch("/api/submit-request", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        alert("Заявка успешно отправлена!");
        setFormData({
          serviceType: "",
          address: "",
          description: "",
          phone: "",
          photo: null,
          commonProblem: "",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Произошла ошибка при отправке заявки");
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      // 5MB limit
      setFormData({ ...formData, photo: file });
    } else {
      alert("Файл слишком большой. Максимальный размер 5MB");
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Заказ бытовых услуг</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Select
              value={formData.serviceType}
              onValueChange={(value) =>
                setFormData({ ...formData, serviceType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип услуги" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.serviceType && (
            <div>
              <Select
                value={formData.commonProblem}
                onValueChange={(value) =>
                  setFormData({ ...formData, commonProblem: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите типовую проблему" />
                </SelectTrigger>
                <SelectContent>
                  {commonProblems[formData.serviceType].map((problem) => (
                    <SelectItem key={problem} value={problem}>
                      {problem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Input
              placeholder="Адрес"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Textarea
              placeholder="Описание проблемы"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <Input
              type="tel"
              placeholder="Номер телефона"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
              pattern="[0-9]+"
            />
          </div>

          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <Input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold"
            />
          </div>

          <Button type="submit" className="w-full">
            Отправить заявку
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
