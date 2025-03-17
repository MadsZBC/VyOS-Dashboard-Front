"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react"

interface NetworkGroup {
  "network-group"?: string;
}

interface InterfaceGroup {
  interface?: string[];
}

interface NetworkGroupConfig {
  network?: string[];
}

interface FirewallGroup {
  "interface-group"?: Record<string, InterfaceGroup>;
  "network-group"?: Record<string, NetworkGroupConfig>;
}

interface FirewallRule {
  action?: string;
  protocol?: string;
  state?: {
    established?: string;
    invalid?: string;
    new?: string;
    related?: string;
  };
  destination?: {
    address?: string;
    port?: string | number;
    group?: NetworkGroup;
  };
  source?: {
    address?: string;
    port?: string | number;
    group?: NetworkGroup;
  };
  description?: string;
  [key: string]: any; // For other properties that might exist
}

interface FilterRules {
  rule: Record<string, FirewallRule>;
  "default-action"?: string;
}

interface NamedFirewall {
  rule: Record<string, FirewallRule>;
  "default-action"?: string;
}

interface IPv4Firewall {
  forward: {
    filter: FilterRules;
  };
  input: {
    filter: FilterRules;
  };
  output?: {
    filter: FilterRules;
  };
  name?: Record<string, NamedFirewall>;
}

interface FirewallProps {
  firewall: {
    ipv4: IPv4Firewall;
    "global-options"?: any;
    group?: FirewallGroup;
  };
}

export default function FirewallRules({ firewall }: FirewallProps) {
  const [activeTab, setActiveTab] = useState("input")

  // Helper function to get rule action color
  const getActionColor = (action: string | undefined): string => {
    switch (action) {
      case "accept":
        return "bg-green-500"
      case "drop":
        return "bg-red-500"
      case "jump":
        return "bg-blue-500"
      case "reject":
        return "bg-orange-500"
      default:
        return "bg-gray-400"
    }
  }

  // Helper function to format rule details
  const formatRuleDetails = (rule: FirewallRule) => {
    const details = []

    if (rule.protocol) {
      details.push(`Protocol: ${rule.protocol}`)
    }

    if (rule.source?.address) {
      details.push(`Source: ${rule.source.address}`)
    } else if (rule.source?.group?.["network-group"]) {
      details.push(`Source Group: ${rule.source.group["network-group"]}`)
    }

    if (rule.destination?.address) {
      details.push(`Destination: ${rule.destination.address}`)
    } else if (rule.destination?.group?.["network-group"]) {
      details.push(`Destination Group: ${rule.destination.group["network-group"]}`)
    }

    if (rule.destination?.port) {
      details.push(`Port: ${rule.destination.port}`)
    }

    if (rule["inbound-interface"]?.group) {
      details.push(`Interface Group: ${rule["inbound-interface"].group}`)
    }

    if (rule["jump-target"]) {
      details.push(`Jump to: ${rule["jump-target"]}`)
    }

    return details
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Firewall Rules
          </CardTitle>
          <CardDescription>Firewall rules controlling traffic flow</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="input" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="input">Input Rules</TabsTrigger>
              <TabsTrigger value="forward">Forward Rules</TabsTrigger>
              <TabsTrigger value="named">Named Rule Sets</TabsTrigger>
              <TabsTrigger value="policies">Global Policies</TabsTrigger>
            </TabsList>

            <TabsContent value="input">
              <Card>
                <CardHeader>
                  <CardTitle>Input Chain Rules</CardTitle>
                  <CardDescription>Rules controlling traffic destined for the router itself</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(firewall.ipv4.input.filter.rule).map(([ruleId, rule]) => (
                        <TableRow key={ruleId}>
                          <TableCell className="font-medium">{ruleId}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`h-3 w-3 rounded-full ${getActionColor(rule.action)}`}></span>
                              <span className="capitalize">{rule.action}</span>
                              {rule["jump-target"] && (
                                <span className="text-xs text-muted-foreground">→ {rule["jump-target"]}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {formatRuleDetails(rule).map((detail, i) => (
                                <Badge key={i} variant="outline">
                                  {detail}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="forward">
              <Card>
                <CardHeader>
                  <CardTitle>Forward Chain Rules</CardTitle>
                  <CardDescription>Rules controlling traffic passing through the router</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(firewall.ipv4.forward.filter.rule).map(([ruleId, rule]) => (
                        <TableRow key={ruleId}>
                          <TableCell className="font-medium">{ruleId}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`h-3 w-3 rounded-full ${getActionColor(rule.action)}`}></span>
                              <span className="capitalize">{rule.action}</span>
                              {rule["jump-target"] && (
                                <span className="text-xs text-muted-foreground">→ {rule["jump-target"]}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {formatRuleDetails(rule).map((detail, i) => (
                                <Badge key={i} variant="outline">
                                  {detail}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="named">
              <div className="grid gap-4">
                {firewall.ipv4.name && Object.entries(firewall.ipv4.name).map(([name, config]) => (
                  <Card key={name}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {name}
                      </CardTitle>
                      <CardDescription>
                        Default Action:{" "}
                        <Badge variant={config["default-action"] === "drop" ? "destructive" : "default"}>
                          {config["default-action"] || "none"}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {config.rule ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rule</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(config.rule).map(([ruleId, rule]) => (
                              <TableRow key={ruleId}>
                                <TableCell className="font-medium">{ruleId}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className={`h-3 w-3 rounded-full ${getActionColor(rule.action)}`}></span>
                                    <span className="capitalize">{rule.action}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {formatRuleDetails(rule).map((detail, i) => (
                                      <Badge key={i} variant="outline">
                                        {detail}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-sm text-muted-foreground">No rules defined</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="policies">
              <Card>
                <CardHeader>
                  <CardTitle>Global State Policies</CardTitle>
                  <CardDescription>Default policies for connection states</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Connection State</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(firewall["global-options"]["state-policy"]).map(([state, config]) => (
                        <TableRow key={state}>
                          <TableCell className="font-medium capitalize">{state}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {config.action === "accept" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="capitalize">{config.action}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {state === "established" && "Traffic that is part of an established connection"}
                            {state === "related" && "Traffic related to an established connection"}
                            {state === "invalid" && "Traffic that does not match connection tracking"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Firewall Groups
          </CardTitle>
          <CardDescription>Network and interface groups used in firewall rules</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Members</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(firewall.group["interface-group"] || {}).map(([name, config]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>Interface Group</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {config.interface?.map((intf: string, i: number) => (
                        <Badge key={i} variant="outline">
                          {intf}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {Object.entries(firewall.group["network-group"] || {}).map(([name, config]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>Network Group</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {config.network?.map((net: string, i: number) => (
                        <Badge key={i} variant="outline">
                          {net}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

