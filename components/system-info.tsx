import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Cpu, User, Terminal, FileText } from "lucide-react"

interface SystemProps {
  system: {
    "domain-name"?: string;
    "host-name"?: string;
    login?: {
      user?: Record<string, {
        authentication?: {
          "encrypted-password"?: string;
          "plaintext-password"?: string;
          "public-keys"?: Record<string, {
            key?: string;
            type?: string;
          }>;
          [key: string]: any;
        };
        "full-name"?: string;
      }>;
    };
    ntp?: {
      server?: Record<string, {
        prefer?: string;
      }>;
    };
    "time-zone"?: string;
    syslog?: {
      global?: {
        facility?: Record<string, {
          level?: string;
        }>;
      };
    };
    [key: string]: any;
  };
}

export default function SystemInfo({ system }: SystemProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>General system configuration and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Hostname</TableCell>
                <TableCell>{system["host-name"]}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Config Management</TableCell>
                <TableCell>Commit Revisions: {system["config-management"]["commit-revisions"]}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Console Speed</TableCell>
                <TableCell>{system.console?.device?.ttyS0?.speed || "Default"} bps</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Accounts
          </CardTitle>
          <CardDescription>System user configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(system.login?.user || {}).map(([username, userConfig]) => (
              <div key={username} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">{username}</h4>
                  <Badge>Active</Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Authentication</span>
                    <span>
                      {userConfig.authentication["encrypted-password"] ? (
                        <Badge variant="outline">Password</Badge>
                      ) : (
                        <Badge variant="outline">No Password</Badge>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SSH Keys</span>
                    <span>
                      {userConfig.authentication["public-keys"] ? (
                        <Badge variant="outline">
                          {Object.keys(userConfig.authentication["public-keys"]).length} key(s)
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Keys</Badge>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Connection Tracking
          </CardTitle>
          <CardDescription>Connection tracking modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(system.conntrack?.modules || {}).map((module) => (
              <Badge key={module} variant="outline" className="justify-center py-2">
                {module}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            System Logging
          </CardTitle>
          <CardDescription>Syslog configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {system.syslog?.global?.facility ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead>Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(system.syslog.global.facility).map(([facility, config]) => (
                  <TableRow key={facility}>
                    <TableCell className="font-medium">{facility}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{config.level}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground py-4">No syslog configuration found</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

