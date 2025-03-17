import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Globe, ArrowRight } from "lucide-react"

interface NatRule {
  source?: {
    address?: string;
  };
  "outbound-interface"?: {
    name?: string;
  };
  translation?: {
    address?: string;
  };
}

interface NatRulesProps {
  nat: {
    source: {
      rule: Record<string, NatRule>;
    };
  };
}

export default function NatRules({ nat }: NatRulesProps) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            NAT Rules
          </CardTitle>
          <CardDescription>
            Network Address Translation rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Source NAT Rules</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Outbound Interface</TableHead>
                    <TableHead>Translation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(nat.source.rule).map(([ruleId, rule]) => (
                    <TableRow key={ruleId}>
                      <TableCell className="font-medium">{ruleId}</TableCell>
                      <TableCell>
                        {rule.source?.address ? (
                          <Badge variant="outline">{rule.source.address}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {rule["outbound-interface"]?.name ? (
                          <Badge variant="outline">{rule["outbound-interface"].name}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{rule.translation?.address || "-"}</span>
                          {rule.translation?.address === "masquerade" && (
                            <Badge variant="secondary" className="ml-2">Dynamic</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">NAT Flow Visualization</h3>
              <div className="p-4 border rounded-lg bg-background">
                <div className="flex flex-col items-center space-y-6">
                  <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                    <div className="flex flex-col items-center text-center">
                      <Badge variant="outline" className="mb-2">Internal Network</Badge>
                      <div className="text-sm">192.168.0.0/24</div>
                      <div className="text-xs text-muted-foreground mt-1">Private IP Range</div>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <Badge variant="outline" className="mb-2">External Network</Badge>
                      <div className="text-sm">77.90.39.119/24</div>
                      <div className="text-xs text-muted-foreground mt-1">Public IP</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center w-full max-w-2xl justify-center">
                    <div className="h-0.5 w-1/3 bg-border"></div>
                    <ArrowRight className="mx-2" />
                    <div className="h-0.5 w-1/3 bg-border"></div>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg w-full max-w-2xl">
                    <div className="text-center font-medium mb-2">NAT Translation</div>
                    <div className="text-sm text-center">
                      Source Address Translation (Masquerade)
                      <div className="text-xs text-muted-foreground mt-1">
                        Internal clients appear as 77.90.39.119 to external servers
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

