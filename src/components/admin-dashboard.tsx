"use client";

import { Card, CardBody } from "@heroui/react";

export function AdminDashboard() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
                <CardBody className="p-6">
                    <h3 className="text-lg font-semibold mb-2">Total Users</h3>
                    <p className="text-3xl font-bold text-primary">1</p>
                </CardBody>
            </Card>
            <Card>
                <CardBody className="p-6">
                    <h3 className="text-lg font-semibold mb-2">Active Sessions</h3>
                    <p className="text-3xl font-bold text-success">1</p>
                </CardBody>
            </Card>
            <Card>
                <CardBody className="p-6">
                    <h3 className="text-lg font-semibold mb-2">System Status</h3>
                    <p className="text-3xl font-bold text-success">Healthy</p>
                </CardBody>
            </Card>
        </div>
    );
}
